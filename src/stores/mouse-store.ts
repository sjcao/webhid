import { create } from 'zustand';
import { hidService } from '@/services/hid/browser-hid-service';
import { readJson, writeJson } from '@/lib/storage';
import { useDeviceStore } from './device-store';
import {
  ButtonId,
  ButtonMappingPayload,
  KeyFunctionType,
  MacroButtonType,
  MouseCommands,
  ParamType,
  ParsedMouseResponse,
  WorkMode,
  parseMouseResponse,
} from '@/protocol/mouse';
import { getMacroDelay, MacroActionKind, type MacroAction, SavedMacro, useMacroStore } from './macro-store';

type MouseState = {
  activeProfile: number;
  dpi: number;
  workMode: WorkMode;
  version: string;
  deviceType: 'mouse' | 'receiver';
  buttonConfigs: Partial<Record<ButtonId, ButtonMappingPayload>>;
  macroSlots: Record<number, string>;
  lastError: string | null;
  lastErrorSource: 'parse' | 'command' | null;
  deviceUnresponsive: boolean;
  macroUploading: boolean;
  handleInputReport: (data: Uint8Array) => void;
  clearLastError: () => void;
  refreshInitialState: () => Promise<void>;
  selectProfile: (profile: number) => Promise<void>;
  updateDpi: (dpi: number) => Promise<void>;
  readButton: (buttonId: ButtonId) => Promise<void>;
  setButtonMapping: (payload: ButtonMappingPayload) => Promise<void>;
  bindComboToButton: (buttonId: ButtonId, values: number[]) => Promise<void>;
  bindMacroToButton: (buttonId: ButtonId, macro: SavedMacro) => Promise<void>;
  resetButtons: () => Promise<void>;
  resetAll: () => Promise<void>;
};

const MACRO_SLOT_STORAGE_KEY = 'mouse-hid.macro-slots.v1';

function loadMacroSlots(): Record<number, string> {
  const raw = readJson<unknown>(MACRO_SLOT_STORAGE_KEY, null);
  if (raw === null) {
    const seeded: Record<number, string> = {};
    useMacroStore.getState().macros.forEach((macro, index) => { seeded[index] = macro.id; });
    persistMacroSlots(seeded);
    return seeded;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const slots: Record<number, string> = {};
  for (const [slot, macroId] of Object.entries(raw)) {
    const parsed = Number(slot);
    if (Number.isInteger(parsed) && parsed >= 0 && typeof macroId === 'string') slots[parsed] = macroId;
  }
  return slots;
}

function persistMacroSlots(slots: Record<number, string>) { writeJson(MACRO_SLOT_STORAGE_KEY, slots); }
function pruneMacroSlots(slots: Record<number, string>, macros: SavedMacro[]): Record<number, string> {
  const existingIds = new Set(macros.map((macro) => macro.id));
  const pruned: Record<number, string> = {};
  for (const [slot, macroId] of Object.entries(slots)) if (existingIds.has(macroId)) pruned[Number(slot)] = macroId;
  return pruned;
}
function resolveMacroSlot(slots: Record<number, string>, macroId: string, buttonConfigs: Partial<Record<ButtonId, ButtonMappingPayload>>) {
  const existing = Object.entries(slots).find(([, id]) => id === macroId);
  if (existing) return Number(existing[0]);
  const reserved = new Set<number>();
  for (const config of Object.values(buttonConfigs)) if (config?.functionType === KeyFunctionType.Macro) reserved.add(config.index);
  let slot = 0;
  while (slots[slot] !== undefined || reserved.has(slot)) slot += 1;
  return slot;
}
const ALL_BUTTON_IDS = [ButtonId.Left, ButtonId.Right, ButtonId.Middle, ButtonId.Forward, ButtonId.Backward, ButtonId.Dpi] as const;
const READ_ACK_TIMEOUT_MS = 500;
let refreshSequence = 0;
async function sendOrPreview(command: Uint8Array) { if (useDeviceStore.getState().previewMode) return; await hidService.send(command); }
async function sendBatchOrPreview(commands: Uint8Array[]) { if (useDeviceStore.getState().previewMode) return; await hidService.sendBatch(commands); }
function failureMessage(error: unknown) { return error instanceof Error ? error.message : 'Failed to send HID command.'; }
function commandFailure(error: unknown) { return { lastError: failureMessage(error), lastErrorSource: 'command' as const }; }
function commandSuccess(state: MouseState): Partial<MouseState> {
  return state.lastErrorSource === 'command'
    ? { lastError: null, lastErrorSource: null, deviceUnresponsive: false }
    : { deviceUnresponsive: false };
}

type ResponseMatcher = (response: ParsedMouseResponse) => boolean;

function withoutTrailingZeros(values: number[]) {
  let length = values.length;
  while (length > 0 && values[length - 1] === 0) length -= 1;
  return values.slice(0, length);
}

function valuesMatch(expected: number[], actual: number[]) {
  const normalizedExpected = withoutTrailingZeros(expected);
  const normalizedActual = withoutTrailingZeros(actual);
  return normalizedExpected.length === normalizedActual.length &&
    normalizedExpected.every((value, index) => value === normalizedActual[index]);
}

function waitForResponse(matches: ResponseMatcher) {
  if (useDeviceStore.getState().previewMode) return { promise: Promise.resolve(true), cancel: () => {} };
  let cancel = () => {};
  const promise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(value);
    };
    const timer = setTimeout(() => finish(false), READ_ACK_TIMEOUT_MS);
    const unsubscribe = hidService.subscribe((data) => {
      try {
        const response = parseMouseResponse(data);
        if (!matches(response)) return;
        finish(true);
      } catch { /* malformed reports are handled by handleInputReport */ }
    });
    cancel = () => finish(false);
  });
  return { promise, cancel };
}
async function readWithAck(command: Uint8Array, matches: ResponseMatcher) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { promise, cancel } = waitForResponse(matches);
    try { await sendOrPreview(command); } catch { cancel(); return false; }
    if (await promise) return true;
  }
  return false;
}
async function writeWithAck(command: Uint8Array, matches: ResponseMatcher) {
  if (useDeviceStore.getState().previewMode) return;
  const { promise, cancel } = waitForResponse(matches);
  try {
    await sendOrPreview(command);
  } catch (error) {
    cancel();
    throw error;
  }
  if (!(await promise)) throw new Error('The device did not acknowledge the HID command.');
}
async function resendReads(commands: Uint8Array[]) { try { for (const command of commands) await sendOrPreview(command); } catch { /* triggering failure is already recorded */ } }
function applyResponse(state: MouseState, response: ParsedMouseResponse): Partial<MouseState> {
  switch (response.type) {
    case ParamType.Dpi: return { dpi: response.dpi };
    case ParamType.Profile: return { activeProfile: response.profile };
    case ParamType.WorkMode: return { workMode: response.mode };
    case ParamType.Version: return { version: response.version, deviceType: response.deviceType };
    case ParamType.Button: return { buttonConfigs: { ...state.buttonConfigs, [response.buttonId]: { buttonId: response.buttonId, functionType: response.functionType, index: response.index, values: response.values } } };
    default: return {};
  }
}

export const useMouseStore = create<MouseState>((set, get) => ({
  activeProfile: 0, dpi: 1600, workMode: WorkMode.Wired, version: 'v1.0', deviceType: 'mouse', buttonConfigs: {}, macroSlots: loadMacroSlots(), lastError: null, lastErrorSource: null, deviceUnresponsive: false, macroUploading: false,
  handleInputReport: (data) => {
    try {
      const response = parseMouseResponse(data);
      set((state) => ({ ...applyResponse(state, response), ...(state.lastErrorSource === 'parse' ? { lastError: null, lastErrorSource: null } : {}) }));
    } catch (error) { set({ lastError: error instanceof Error ? error.message : 'Failed to parse HID report.', lastErrorSource: 'parse' }); }
  },
  clearLastError: () => set({ lastError: null, lastErrorSource: null, deviceUnresponsive: false }),
  refreshInitialState: async () => {
    const refreshId = ++refreshSequence;
    const deviceState = useDeviceStore.getState();
    const previewMode = deviceState.previewMode;
    const expectedDevice = deviceState.currentDevice?.device ?? null;
    const isCurrentRefresh = () => {
      const current = useDeviceStore.getState();
      return refreshId === refreshSequence &&
        current.previewMode === previewMode &&
        (expectedDevice === null || current.currentDevice?.device === expectedDevice);
    };
    if (previewMode) {
      const previewDefaultConfigs: Partial<Record<ButtonId, ButtonMappingPayload>> = {
        [ButtonId.Left]: { buttonId: ButtonId.Left, functionType: KeyFunctionType.Mouse, index: 1, values: [] }, [ButtonId.Right]: { buttonId: ButtonId.Right, functionType: KeyFunctionType.Mouse, index: 2, values: [] }, [ButtonId.Middle]: { buttonId: ButtonId.Middle, functionType: KeyFunctionType.Mouse, index: 3, values: [] }, [ButtonId.Forward]: { buttonId: ButtonId.Forward, functionType: KeyFunctionType.Mouse, index: 5, values: [] }, [ButtonId.Backward]: { buttonId: ButtonId.Backward, functionType: KeyFunctionType.Mouse, index: 4, values: [] }, [ButtonId.Dpi]: { buttonId: ButtonId.Dpi, functionType: KeyFunctionType.DpiAction, index: 0, values: [] },
      };
      if (isCurrentRefresh()) set({ buttonConfigs: previewDefaultConfigs });
    } else {
      if (!isCurrentRefresh()) return;
      set({ lastError: null, lastErrorSource: null, deviceUnresponsive: false });
      const reads: Array<[Uint8Array, ResponseMatcher]> = [
        [MouseCommands.readWorkMode(), (response) => response.type === ParamType.WorkMode],
        [MouseCommands.readVersion(0), (response) => response.type === ParamType.Version],
        [MouseCommands.readProfile(), (response) => response.type === ParamType.Profile],
        [MouseCommands.readDpi(), (response) => response.type === ParamType.Dpi],
      ];
      for (const buttonId of ALL_BUTTON_IDS) {
        reads.push([
          MouseCommands.readButton(buttonId),
          (response) => response.type === ParamType.Button && response.buttonId === buttonId,
        ]);
      }
      let responsive = true;
      for (const [command, matches] of reads) {
        if (!isCurrentRefresh()) return;
        responsive = (await readWithAck(command, matches)) && responsive;
      }
      if (isCurrentRefresh()) set({ deviceUnresponsive: !responsive });
    }
  },
  selectProfile: async (profile) => {
    const previous = get().activeProfile;
    set({ activeProfile: profile });
    try {
      await writeWithAck(MouseCommands.switchProfile(profile), (response) => response.type === ParamType.Profile && response.profile === profile);
      set((state) => commandSuccess(state));
    } catch (error) {
      set((state) => ({ ...(state.activeProfile === profile ? { activeProfile: previous } : {}), ...commandFailure(error) }));
      await resendReads([MouseCommands.readProfile()]);
    }
  },
  updateDpi: async (dpi) => {
    const previous = get().dpi;
    set({ dpi });
    try {
      await writeWithAck(MouseCommands.setDpi(dpi), (response) => response.type === ParamType.Dpi && response.dpi === dpi);
      set((state) => commandSuccess(state));
    } catch (error) {
      set((state) => ({ ...(state.dpi === dpi ? { dpi: previous } : {}), ...commandFailure(error) }));
      await resendReads([MouseCommands.readDpi()]);
    }
  },
  readButton: async (buttonId) => {
    try {
      const acknowledged = await readWithAck(
        MouseCommands.readButton(buttonId),
        (response) => response.type === ParamType.Button && response.buttonId === buttonId,
      );
      if (!acknowledged) throw new Error('The device did not respond to the HID command.');
      set((state) => commandSuccess(state));
    } catch (error) { set(commandFailure(error)); }
  },
  setButtonMapping: async (payload) => {
    const previous = get().buttonConfigs[payload.buttonId];
    set((state) => ({ buttonConfigs: { ...state.buttonConfigs, [payload.buttonId]: payload } }));
    try {
      await writeWithAck(MouseCommands.setButtonMapping(payload), (response) => (
        response.type === ParamType.Button &&
        response.buttonId === payload.buttonId &&
        response.functionType === payload.functionType &&
        response.index === payload.index &&
        valuesMatch(payload.values, response.values)
      ));
      set((state) => commandSuccess(state));
    } catch (error) {
      set((state) => {
        if (state.buttonConfigs[payload.buttonId] !== payload) return commandFailure(error);
        const buttonConfigs = { ...state.buttonConfigs };
        if (previous) buttonConfigs[payload.buttonId] = previous;
        else delete buttonConfigs[payload.buttonId];
        return { buttonConfigs, ...commandFailure(error) };
      });
      await resendReads([MouseCommands.readButton(payload.buttonId)]);
    }
  },
  bindComboToButton: async (buttonId, values) => {
    const payload: ButtonMappingPayload = { buttonId, functionType: KeyFunctionType.ComboKey, index: 0, values };
    await get().setButtonMapping(payload);
  },
  bindMacroToButton: async (buttonId, macro) => {
    if (get().macroUploading) return;
    const previousSlots = get().macroSlots;
    const slots = pruneMacroSlots(previousSlots, useMacroStore.getState().macros);
    const slot = resolveMacroSlot(slots, macro.id, get().buttonConfigs);
    const previous = get().buttonConfigs[buttonId];
    const repeatType = macro.repeatType === 0xf4 ? macro.loopTimes : macro.repeatType;
    let frames: Uint8Array[];
    let terminator: Uint8Array;
    try {
      frames = macro.actions.map((action, index) => MouseCommands.setButtonMacro({ buttonId, macroId: slot, repeatType, macroButtonType: macroButtonTypeForAction(action), delayMs: getMacroDelay(index, macro.actions), values: macroValueForAction(action) }));
      terminator = MouseCommands.setButtonMacro({ buttonId, macroId: slot, repeatType, macroButtonType: MacroButtonType.KeyUp, delayMs: 0, values: [0x00] });
    } catch (error) {
      set(commandFailure(error));
      return;
    }
    slots[slot] = macro.id;
    set((state) => ({ macroUploading: true, macroSlots: slots, buttonConfigs: { ...state.buttonConfigs, [buttonId]: { buttonId, functionType: KeyFunctionType.Macro, index: slot, values: [slot] } } }));
    persistMacroSlots(slots);
    try {
      await sendBatchOrPreview([...frames, terminator]);
      set((state) => commandSuccess(state));
    } catch (error) {
      set((state) => { const buttonConfigs = { ...state.buttonConfigs }; if (previous) buttonConfigs[buttonId] = previous; else delete buttonConfigs[buttonId]; return { buttonConfigs, macroSlots: previousSlots, ...commandFailure(error) }; });
      persistMacroSlots(previousSlots);
      await sendBatchOrPreview([terminator]).catch(() => undefined);
      await resendReads([MouseCommands.readButton(buttonId)]);
    } finally { set({ macroUploading: false }); }
  },
  resetButtons: async () => {
    const previous = get().buttonConfigs;
    const optimistic: Partial<Record<ButtonId, ButtonMappingPayload>> = {};
    set({ buttonConfigs: optimistic });
    try {
      await writeWithAck(MouseCommands.resetButtons(), (response) => response.type === ParamType.Reset && response.resetType === 1);
      set((state) => commandSuccess(state));
    } catch (error) {
      set((state) => ({ ...(state.buttonConfigs === optimistic ? { buttonConfigs: previous } : {}), ...commandFailure(error) }));
      await resendReads(ALL_BUTTON_IDS.map((buttonId) => MouseCommands.readButton(buttonId)));
    }
  },
  resetAll: async () => {
    const previous = { activeProfile: get().activeProfile, dpi: get().dpi, buttonConfigs: get().buttonConfigs };
    const optimistic: Partial<Record<ButtonId, ButtonMappingPayload>> = {};
    set({ activeProfile: 0, dpi: 1600, buttonConfigs: optimistic });
    try {
      await writeWithAck(MouseCommands.resetAll(), (response) => response.type === ParamType.Reset && response.resetType === 0);
      set((state) => commandSuccess(state));
    } catch (error) {
      set((state) => ({
        ...(state.activeProfile === 0 ? { activeProfile: previous.activeProfile } : {}),
        ...(state.dpi === 1600 ? { dpi: previous.dpi } : {}),
        ...(state.buttonConfigs === optimistic ? { buttonConfigs: previous.buttonConfigs } : {}),
        ...commandFailure(error),
      }));
      await resendReads([MouseCommands.readProfile(), MouseCommands.readDpi(), ...ALL_BUTTON_IDS.map((buttonId) => MouseCommands.readButton(buttonId))]);
      return;
    }
    await get().refreshInitialState();
  },
}));
useMacroStore.subscribe((state) => { const slots = useMouseStore.getState().macroSlots; const pruned = pruneMacroSlots(slots, state.macros); if (Object.keys(pruned).length === Object.keys(slots).length) return; useMouseStore.setState({ macroSlots: pruned }); persistMacroSlots(pruned); });
const MACRO_MOUSE_VALUES: Record<string, number> = {
  left: 0, right: 1, middle: 2,
  '左键按下': 0, '左键抬起': 0,
  '右键按下': 1, '右键抬起': 1,
  '中键按下': 2, '中键抬起': 2,
};
function macroValueForAction(action: MacroAction) {
  if (action.direction === 'up') return [0x00];
  if (action.kind === MacroActionKind.Mouse) {
    const namedValue = MACRO_MOUSE_VALUES[action.keyName];
    return [namedValue ?? action.keyCode[0] ?? 0];
  }
  return [action.keyCode[0] ?? 0];
}
export function macroButtonTypeForAction(action: MacroAction) { if (action.direction === 'up') return MacroButtonType.KeyUp; return action.kind === MacroActionKind.Mouse ? MacroButtonType.MouseDown : MacroButtonType.KeyboardDown; }
