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
    // 槽位映射启用前，设备槽位就是宏在库中的下标；首次加载时按下标回填，
    // 让升级前写入设备的宏绑定仍能解析出宏名，而不是显示“未知宏”
    const seeded: Record<number, string> = {};
    useMacroStore.getState().macros.forEach((macro, index) => {
      seeded[index] = macro.id;
    });
    persistMacroSlots(seeded);
    return seeded;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const slots: Record<number, string> = {};
  for (const [slot, macroId] of Object.entries(raw)) {
    const parsed = Number(slot);
    if (Number.isInteger(parsed) && parsed >= 0 && typeof macroId === 'string') {
      slots[parsed] = macroId;
    }
  }
  return slots;
}

function persistMacroSlots(slots: Record<number, string>) {
  writeJson(MACRO_SLOT_STORAGE_KEY, slots);
}

function pruneMacroSlots(slots: Record<number, string>, macros: SavedMacro[]): Record<number, string> {
  const existingIds = new Set(macros.map((macro) => macro.id));
  const pruned: Record<number, string> = {};
  for (const [slot, macroId] of Object.entries(slots)) {
    if (existingIds.has(macroId)) pruned[Number(slot)] = macroId;
  }
  return pruned;
}

function resolveMacroSlot(
  slots: Record<number, string>,
  macroId: string,
  buttonConfigs: Partial<Record<ButtonId, ButtonMappingPayload>>
) {
  const existing = Object.entries(slots).find(([, id]) => id === macroId);
  if (existing) return Number(existing[0]);
  // 删除宏只释放映射，设备侧按键可能仍绑定着旧槽位；
  // 这些槽位不可复用，否则旧绑定会静默播放新上传的宏
  const reserved = new Set<number>();
  for (const config of Object.values(buttonConfigs)) {
    if (config?.functionType === KeyFunctionType.Macro) reserved.add(config.index);
  }
  let slot = 0;
  while (slots[slot] !== undefined || reserved.has(slot)) slot += 1;
  return slot;
}

const ALL_BUTTON_IDS = [
  ButtonId.Left,
  ButtonId.Right,
  ButtonId.Middle,
  ButtonId.Forward,
  ButtonId.Backward,
  ButtonId.Dpi,
] as const;

const READ_ACK_TIMEOUT_MS = 500;

async function sendOrPreview(command: Uint8Array) {
  if (useDeviceStore.getState().previewMode) return;
  await hidService.send(command);
}

async function sendBatchOrPreview(commands: Uint8Array[]) {
  if (useDeviceStore.getState().previewMode) return;
  await hidService.sendBatch(commands);
}

function failureMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Failed to send HID command.';
}

function commandFailure(error: unknown) {
  return { lastError: failureMessage(error), lastErrorSource: 'command' as const };
}

function waitForResponse(type: ParamType, buttonId?: ButtonId) {
  if (useDeviceStore.getState().previewMode) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, READ_ACK_TIMEOUT_MS);
    const unsubscribe = hidService.subscribe((data) => {
      try {
        const response = parseMouseResponse(data);
        if (response.type !== type) return;
        if (buttonId !== undefined && (response.type !== ParamType.Button || response.buttonId !== buttonId)) return;
        clearTimeout(timer);
        unsubscribe();
        resolve(true);
      } catch {
        // Malformed reports are recorded by handleInputReport; keep waiting.
      }
    });
  });
}

async function readWithAck(command: Uint8Array, type: ParamType, buttonId?: ButtonId) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const acked = waitForResponse(type, buttonId);
    try {
      await sendOrPreview(command);
    } catch {
      return false;
    }
    if (await acked) return true;
  }
  return false;
}

async function resendReads(commands: Uint8Array[]) {
  try {
    for (const command of commands) {
      await sendOrPreview(command);
    }
  } catch {
    // Device unreachable; the triggering failure is already recorded in lastError.
  }
}

function applyResponse(state: MouseState, response: ParsedMouseResponse): Partial<MouseState> {
  switch (response.type) {
    case ParamType.Dpi:
      return { dpi: response.dpi };
    case ParamType.Profile:
      return { activeProfile: response.profile };
    case ParamType.WorkMode:
      return { workMode: response.mode };
    case ParamType.Version:
      return { version: response.version, deviceType: response.deviceType };
    case ParamType.Button:
      return {
        buttonConfigs: {
          ...state.buttonConfigs,
          [response.buttonId]: {
            buttonId: response.buttonId,
            functionType: response.functionType,
            index: response.index,
            values: response.values,
          },
        },
      };
    default:
      return {};
  }
}

export const useMouseStore = create<MouseState>((set, get) => ({
  activeProfile: 0,
  dpi: 1600,
  workMode: WorkMode.Wired,
  version: 'v1.0',
  deviceType: 'mouse',
  buttonConfigs: {},
  macroSlots: loadMacroSlots(),
  lastError: null,
  lastErrorSource: null,
  deviceUnresponsive: false,
  macroUploading: false,
  handleInputReport: (data) => {
    try {
      const response = parseMouseResponse(data);
      // 有效报告只自愈解析类错误；写失败横幅保留到用户确认或主动纠偏
      set((state) => ({
        ...applyResponse(state, response),
        ...(state.lastErrorSource === 'parse' ? { lastError: null, lastErrorSource: null } : {}),
      }));
    } catch (error) {
      set({
        lastError: error instanceof Error ? error.message : 'Failed to parse HID report.',
        lastErrorSource: 'parse',
      });
    }
  },
  clearLastError: () => set({ lastError: null, lastErrorSource: null, deviceUnresponsive: false }),
  refreshInitialState: async () => {
    const previewMode = useDeviceStore.getState().previewMode;
    if (previewMode) {
      const previewDefaultConfigs: Partial<Record<ButtonId, ButtonMappingPayload>> = {
        [ButtonId.Left]: { buttonId: ButtonId.Left, functionType: KeyFunctionType.Mouse, index: 1, values: [] },
        [ButtonId.Right]: { buttonId: ButtonId.Right, functionType: KeyFunctionType.Mouse, index: 2, values: [] },
        [ButtonId.Middle]: { buttonId: ButtonId.Middle, functionType: KeyFunctionType.Mouse, index: 3, values: [] },
        [ButtonId.Forward]: { buttonId: ButtonId.Forward, functionType: KeyFunctionType.Mouse, index: 5, values: [] },
        [ButtonId.Backward]: { buttonId: ButtonId.Backward, functionType: KeyFunctionType.Mouse, index: 4, values: [] },
        [ButtonId.Dpi]: { buttonId: ButtonId.Dpi, functionType: KeyFunctionType.DpiAction, index: 0, values: [] },
      };
      set({ buttonConfigs: previewDefaultConfigs });
    } else {
      set({ lastError: null, lastErrorSource: null, deviceUnresponsive: false });
      let responsive = await readWithAck(MouseCommands.readWorkMode(), ParamType.WorkMode);
      responsive = (await readWithAck(MouseCommands.readVersion(0), ParamType.Version)) && responsive;
      responsive = (await readWithAck(MouseCommands.readProfile(), ParamType.Profile)) && responsive;
      responsive = (await readWithAck(MouseCommands.readDpi(), ParamType.Dpi)) && responsive;

      // 真实连接时，自动循环读取全部按键当前绑定
      for (const buttonId of ALL_BUTTON_IDS) {
        responsive = (await readWithAck(MouseCommands.readButton(buttonId), ParamType.Button, buttonId)) && responsive;
      }
      set({ deviceUnresponsive: !responsive });
    }
  },
  selectProfile: async (profile) => {
    set({ activeProfile: profile });
    try {
      await sendOrPreview(MouseCommands.switchProfile(profile));
    } catch (error) {
      set(commandFailure(error));
      await resendReads([MouseCommands.readProfile()]);
    }
  },
  updateDpi: async (dpi) => {
    set({ dpi });
    try {
      await sendOrPreview(MouseCommands.setDpi(dpi));
    } catch (error) {
      set(commandFailure(error));
      await resendReads([MouseCommands.readDpi()]);
    }
  },
  readButton: async (buttonId) => {
    try {
      await sendOrPreview(MouseCommands.readButton(buttonId));
    } catch (error) {
      set(commandFailure(error));
    }
  },
  setButtonMapping: async (payload) => {
    set((state) => ({ buttonConfigs: { ...state.buttonConfigs, [payload.buttonId]: payload } }));
    try {
      await sendOrPreview(MouseCommands.setButtonMapping(payload));
    } catch (error) {
      set(commandFailure(error));
      await resendReads([MouseCommands.readButton(payload.buttonId)]);
    }
  },
  bindComboToButton: async (buttonId, values) => {
    const payload = { buttonId, functionType: KeyFunctionType.ComboKey, index: 0, values };
    set((state) => ({ buttonConfigs: { ...state.buttonConfigs, [buttonId]: payload } }));
    try {
      await sendOrPreview(MouseCommands.setButtonMapping(payload));
    } catch (error) {
      set(commandFailure(error));
      await resendReads([MouseCommands.readButton(buttonId)]);
    }
  },
  bindMacroToButton: async (buttonId, macro) => {
    const slots = pruneMacroSlots(get().macroSlots, useMacroStore.getState().macros);
    const slot = resolveMacroSlot(slots, macro.id, get().buttonConfigs);
    slots[slot] = macro.id;

    const previous = get().buttonConfigs[buttonId];
    set((state) => ({
      macroUploading: true,
      macroSlots: slots,
      buttonConfigs: {
        ...state.buttonConfigs,
        [buttonId]: { buttonId, functionType: KeyFunctionType.Macro, index: slot, values: [slot] },
      },
    }));
    persistMacroSlots(slots);

    const repeatType = macro.repeatType === 0xf4 ? macro.loopTimes : macro.repeatType;
    const frames = macro.actions.map((action, index) =>
      MouseCommands.setButtonMacro({
        buttonId,
        macroId: slot,
        repeatType,
        macroButtonType: macroButtonTypeForAction(action),
        delayMs: getMacroDelay(index, macro.actions),
        values: action.direction === 'up' ? [0x00] : normalizeMacroValue(action.keyCode),
      })
    );
    const terminator = MouseCommands.setButtonMacro({
      buttonId,
      macroId: slot,
      repeatType,
      macroButtonType: MacroButtonType.KeyUp,
      delayMs: 0,
      values: [0x00],
    });

    try {
      // 全部宏帧加终止帧作为一个批次上传，其他写命令只能排在批次之后
      await sendBatchOrPreview([...frames, terminator]);
    } catch (error) {
      set((state) => {
        const buttonConfigs = { ...state.buttonConfigs };
        if (previous) {
          buttonConfigs[buttonId] = previous;
        } else {
          delete buttonConfigs[buttonId];
        }
        return { buttonConfigs, ...commandFailure(error) };
      });
      // 尽力补发终止帧闭合设备上的残缺宏，再回读该按键呈现真实状态
      await sendBatchOrPreview([terminator]).catch(() => undefined);
      await resendReads([MouseCommands.readButton(buttonId)]);
    } finally {
      set({ macroUploading: false });
    }
  },
  resetButtons: async () => {
    set({ buttonConfigs: {} });
    try {
      await sendOrPreview(MouseCommands.resetButtons());
    } catch (error) {
      set(commandFailure(error));
      await resendReads(ALL_BUTTON_IDS.map((buttonId) => MouseCommands.readButton(buttonId)));
    }
  },
  resetAll: async () => {
    set({ activeProfile: 0, dpi: 1600, buttonConfigs: {} });
    try {
      await sendOrPreview(MouseCommands.resetAll());
    } catch (error) {
      // 失败时跳过 refreshInitialState，避免其开头的清错把失败信息抹掉；改为定点回读纠偏
      set(commandFailure(error));
      await resendReads([
        MouseCommands.readProfile(),
        MouseCommands.readDpi(),
        ...ALL_BUTTON_IDS.map((buttonId) => MouseCommands.readButton(buttonId)),
      ]);
      return;
    }
    await get().refreshInitialState();
  },
}));

useMacroStore.subscribe((state) => {
  const slots = useMouseStore.getState().macroSlots;
  const pruned = pruneMacroSlots(slots, state.macros);
  if (Object.keys(pruned).length === Object.keys(slots).length) return;
  useMouseStore.setState({ macroSlots: pruned });
  persistMacroSlots(pruned);
});

function normalizeMacroValue(values: number[]) {
  return values.length === 2 && values[1] === 0x00 ? [values[0]] : values;
}

export function macroButtonTypeForAction(action: MacroAction) {
  if (action.direction === 'up') return MacroButtonType.KeyUp;
  return action.kind === MacroActionKind.Mouse ? MacroButtonType.MouseDown : MacroButtonType.KeyboardDown;
}
