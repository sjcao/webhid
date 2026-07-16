import { create } from 'zustand';
import { hidService } from '@/services/hid/browser-hid-service';
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
import { getMacroDelay, MacroActionKind, type MacroAction, SavedMacro } from './macro-store';

type MouseState = {
  activeProfile: number;
  dpi: number;
  workMode: WorkMode;
  version: string;
  deviceType: 'mouse' | 'receiver';
  buttonConfigs: Partial<Record<ButtonId, ButtonMappingPayload>>;
  lastError: string | null;
  handleInputReport: (data: Uint8Array) => void;
  refreshInitialState: () => Promise<void>;
  selectProfile: (profile: number) => Promise<void>;
  updateDpi: (dpi: number) => Promise<void>;
  readButton: (buttonId: ButtonId) => Promise<void>;
  setButtonMapping: (payload: ButtonMappingPayload) => Promise<void>;
  bindComboToButton: (buttonId: ButtonId, values: number[]) => Promise<void>;
  bindMacroToButton: (buttonId: ButtonId, macroIndex: number, macro: SavedMacro) => Promise<void>;
  resetButtons: () => Promise<void>;
  resetAll: () => Promise<void>;
};

async function sendOrPreview(command: Uint8Array) {
  if (useDeviceStore.getState().previewMode) return;
  await hidService.send(command);
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
  lastError: null,
  handleInputReport: (data) => {
    try {
      const response = parseMouseResponse(data);
      set((state) => ({ ...applyResponse(state, response), lastError: null }));
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Failed to parse HID report.' });
    }
  },
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
      await sendOrPreview(MouseCommands.readWorkMode());
      await sendOrPreview(MouseCommands.readVersion(0));
      await sendOrPreview(MouseCommands.readProfile());
      await sendOrPreview(MouseCommands.readDpi());
      
      // 真实连接时，自动循环读取全部按键当前绑定
      for (const buttonId of [
        ButtonId.Left,
        ButtonId.Right,
        ButtonId.Middle,
        ButtonId.Forward,
        ButtonId.Backward,
        ButtonId.Dpi,
      ]) {
        await sendOrPreview(MouseCommands.readButton(buttonId));
      }
    }
  },
  selectProfile: async (profile) => {
    set({ activeProfile: profile });
    await sendOrPreview(MouseCommands.switchProfile(profile));
  },
  updateDpi: async (dpi) => {
    set({ dpi });
    await sendOrPreview(MouseCommands.setDpi(dpi));
  },
  readButton: async (buttonId) => {
    await sendOrPreview(MouseCommands.readButton(buttonId));
  },
  setButtonMapping: async (payload) => {
    set((state) => ({ buttonConfigs: { ...state.buttonConfigs, [payload.buttonId]: payload } }));
    await sendOrPreview(MouseCommands.setButtonMapping(payload));
  },
  bindComboToButton: async (buttonId, values) => {
    const payload = { buttonId, functionType: KeyFunctionType.ComboKey, index: 0, values };
    set((state) => ({ buttonConfigs: { ...state.buttonConfigs, [buttonId]: payload } }));
    await sendOrPreview(MouseCommands.setButtonMapping(payload));
  },
  bindMacroToButton: async (buttonId, macroIndex, macro) => {
    set((state) => ({
      buttonConfigs: {
        ...state.buttonConfigs,
        [buttonId]: { buttonId, functionType: KeyFunctionType.Macro, index: macroIndex, values: [macroIndex] },
      },
    }));

    for (let index = 0; index < macro.actions.length; index += 1) {
      const action = macro.actions[index];
      await sendOrPreview(MouseCommands.setButtonMacro({
        buttonId,
        macroId: macroIndex,
        repeatType: macro.repeatType === 0xf4 ? macro.loopTimes : macro.repeatType,
        macroButtonType: macroButtonTypeForAction(action),
        delayMs: getMacroDelay(index, macro.actions),
        values: action.direction === 'up' ? [0x00] : normalizeMacroValue(action.keyCode),
      }));
    }

    await sendOrPreview(MouseCommands.setButtonMacro({
      buttonId,
      macroId: macroIndex,
      repeatType: macro.repeatType === 0xf4 ? macro.loopTimes : macro.repeatType,
      macroButtonType: MacroButtonType.KeyUp,
      delayMs: 0,
      values: [0x00],
    }));
  },
  resetButtons: async () => {
    set({ buttonConfigs: {} });
    await sendOrPreview(MouseCommands.resetButtons());
  },
  resetAll: async () => {
    set({ activeProfile: 0, dpi: 1600, buttonConfigs: {} });
    await sendOrPreview(MouseCommands.resetAll());
    await get().refreshInitialState();
  },
}));

function normalizeMacroValue(values: number[]) {
  return values.length === 2 && values[1] === 0x00 ? [values[0]] : values;
}

export function macroButtonTypeForAction(action: MacroAction) {
  if (action.direction === 'up') return MacroButtonType.KeyUp;
  return action.kind === MacroActionKind.Mouse ? MacroButtonType.MouseDown : MacroButtonType.KeyboardDown;
}
