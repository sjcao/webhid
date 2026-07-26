import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ButtonId,
  computeDataCrc,
  computePacketCrc,
  KeyFunctionType,
  MacroButtonType,
  MacroRepeatType,
  MouseCommands,
  ParamType,
  WorkMode,
} from '@/protocol/mouse';
import { hidService } from '@/services/hid/browser-hid-service';
import { useDeviceStore } from './device-store';
import { MacroActionKind, MacroDirection, type MacroAction, type SavedMacro, useMacroStore } from './macro-store';
import { macroButtonTypeForAction, useMouseStore } from './mouse-store';

vi.mock('@/services/hid/browser-hid-service', () => {
  const handlers = new Set<(data: Uint8Array) => void>();
  class UnsupportedDeviceError extends Error {
    constructor() {
      super('This device does not expose the mouse control protocol.');
      this.name = 'UnsupportedDeviceError';
    }
  }
  const hidService = {
    supported: false,
    send: vi.fn(async (_command: Uint8Array) => {}),
    sendBatch: vi.fn(async (commands: Uint8Array[]) => {
      for (const command of commands) {
        await hidService.send(command);
      }
    }),
    subscribe: (handler: (data: Uint8Array) => void) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    onConnect: () => () => {},
    onDisconnect: () => () => {},
    getAuthorizedDevices: async () => [],
    requestDevices: async () => [],
    connect: async () => {},
    disconnect: async () => {},
    emitInput: (data: Uint8Array) => handlers.forEach((handler) => handler(data)),
  };
  return { hidService, UnsupportedDeviceError };
});

const sendMock = vi.mocked(hidService.send);
const sendBatchMock = vi.mocked(hidService.sendBatch);

function emitInput(data: Uint8Array) {
  (hidService as unknown as { emitInput: (data: Uint8Array) => void }).emitInput(data);
}

function buildResponsePacket(paramType: ParamType, data: number[]) {
  const packet = new Array(17).fill(0);
  packet[0] = 0x09;
  packet[1] = 0x80;
  packet[2] = paramType;
  packet[3] = data.length;
  data.forEach((value, index) => {
    packet[4 + index] = value & 0xff;
  });
  packet[4 + data.length] = computeDataCrc(data);
  packet[16] = computePacketCrc(packet.slice(0, 16));
  return Uint8Array.from(packet);
}

function versionCodes(version: string) {
  return Array.from(version, (char) => char.charCodeAt(0));
}

function keyboardAction(keyCode: number[], direction: MacroDirection, timestamp: number): MacroAction {
  return { keyName: 'A', kind: MacroActionKind.Keyboard, direction, keyCode, timestamp };
}

function makeMacro(overrides: Partial<SavedMacro> = {}): SavedMacro {
  return {
    id: 'macro-a',
    name: 'Macro A',
    repeatType: MacroRepeatType.LoopTimes,
    loopTimes: 1,
    actions: [keyboardAction([0x04, 0x00], MacroDirection.Down, 0)],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function sentFrames() {
  return sendMock.mock.calls.map(([command]) => Array.from(command));
}

beforeEach(() => {
  localStorage.clear();
  sendMock.mockClear();
  sendMock.mockImplementation(async () => {});
  sendBatchMock.mockClear();
  useDeviceStore.setState({ previewMode: false });
  useMacroStore.setState({ macros: [] });
  useMouseStore.setState({
    activeProfile: 0,
    dpi: 1600,
    workMode: WorkMode.Wired,
    version: 'v1.0',
    deviceType: 'mouse',
    buttonConfigs: {},
    macroSlots: {},
    lastError: null,
    lastErrorSource: null,
    deviceUnresponsive: false,
    macroUploading: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('macroButtonTypeForAction', () => {
  it('uses the existing mouse-down type for mouse actions', () => {
    expect(macroButtonTypeForAction(keyboardAction([1], MacroDirection.Down, 0))).toBe(MacroButtonType.KeyboardDown);
    expect(macroButtonTypeForAction({ ...keyboardAction([1], MacroDirection.Down, 0), kind: MacroActionKind.Mouse })).toBe(MacroButtonType.MouseDown);
  });

  it('keeps keyboard down and generic key-up encoding', () => {
    expect(macroButtonTypeForAction({ ...keyboardAction([1], MacroDirection.Up, 0), kind: MacroActionKind.Mouse })).toBe(MacroButtonType.KeyUp);
    expect(macroButtonTypeForAction(keyboardAction([1], MacroDirection.Up, 0))).toBe(MacroButtonType.KeyUp);
  });
});

describe('handleInputReport', () => {
  it('applies dpi, profile, work mode and version responses', () => {
    const { handleInputReport } = useMouseStore.getState();
    handleInputReport(buildResponsePacket(ParamType.Dpi, [0x0c, 0x80]));
    handleInputReport(buildResponsePacket(ParamType.Profile, [2]));
    handleInputReport(buildResponsePacket(ParamType.WorkMode, [WorkMode.Wireless]));
    handleInputReport(buildResponsePacket(ParamType.Version, [0x01, ...versionCodes('v1.2')]));

    const state = useMouseStore.getState();
    expect(state.dpi).toBe(3200);
    expect(state.activeProfile).toBe(2);
    expect(state.workMode).toBe(WorkMode.Wireless);
    expect(state.version).toBe('v1.2');
    expect(state.deviceType).toBe('receiver');
  });

  it('merges button responses without dropping other button configs', () => {
    const { handleInputReport } = useMouseStore.getState();
    handleInputReport(buildResponsePacket(ParamType.Button, [ButtonId.Left, KeyFunctionType.Mouse, 1]));
    handleInputReport(buildResponsePacket(ParamType.Button, [ButtonId.Right, KeyFunctionType.ComboKey, 0, 0xe0, 0x04]));

    const { buttonConfigs } = useMouseStore.getState();
    expect(buttonConfigs[ButtonId.Left]).toEqual({
      buttonId: ButtonId.Left,
      functionType: KeyFunctionType.Mouse,
      index: 1,
      values: [],
    });
    expect(buttonConfigs[ButtonId.Right]).toEqual({
      buttonId: ButtonId.Right,
      functionType: KeyFunctionType.ComboKey,
      index: 0,
      values: [0xe0, 0x04],
    });
  });

  it('records parse failures in lastError and clears it on the next valid report', () => {
    const { handleInputReport } = useMouseStore.getState();
    handleInputReport(new Uint8Array(16));
    expect(useMouseStore.getState().lastError).toMatch(/Invalid mouse packet format/);

    const corrupted = buildResponsePacket(ParamType.Dpi, [0x06, 0x40]);
    corrupted[16] ^= 0xff;
    handleInputReport(corrupted);
    expect(useMouseStore.getState().lastError).toBe('Mouse packet CRC check failed');

    handleInputReport(buildResponsePacket(ParamType.Dpi, [0x06, 0x40]));
    expect(useMouseStore.getState().lastError).toBeNull();
    expect(useMouseStore.getState().dpi).toBe(1600);
  });
});

describe('bindMacroToButton', () => {
  it('uploads one frame per action plus a terminator with translated repeat and inter-action delays', async () => {
    const macro = makeMacro({
      loopTimes: 3,
      actions: [
        keyboardAction([0x04, 0x00], MacroDirection.Down, 0),
        keyboardAction([0x04, 0x00], MacroDirection.Up, 120),
        { keyName: 'LeftDown', kind: MacroActionKind.Mouse, direction: MacroDirection.Down, keyCode: [0xf0], timestamp: 500 },
      ],
    });
    useMacroStore.setState({ macros: [macro] });

    await useMouseStore.getState().bindMacroToButton(ButtonId.Forward, macro);

    const base = { buttonId: ButtonId.Forward, macroId: 0, repeatType: 3 };
    expect(sentFrames()).toEqual([
      MouseCommands.setButtonMacro({ ...base, macroButtonType: MacroButtonType.KeyboardDown, delayMs: 120, values: [0x04] }),
      MouseCommands.setButtonMacro({ ...base, macroButtonType: MacroButtonType.KeyUp, delayMs: 380, values: [0x00] }),
      MouseCommands.setButtonMacro({ ...base, macroButtonType: MacroButtonType.MouseDown, delayMs: 0, values: [0xf0] }),
      MouseCommands.setButtonMacro({ ...base, macroButtonType: MacroButtonType.KeyUp, delayMs: 0, values: [0x00] }),
    ].map((command) => Array.from(command)));

    const state = useMouseStore.getState();
    expect(state.buttonConfigs[ButtonId.Forward]).toEqual({
      buttonId: ButtonId.Forward,
      functionType: KeyFunctionType.Macro,
      index: 0,
      values: [0],
    });
    expect(state.macroSlots).toEqual({ 0: macro.id });
    expect(state.macroUploading).toBe(false);
  });

  it('encodes the exact wire bytes for a single-action macro upload', async () => {
    const macro = makeMacro({ loopTimes: 3 });
    useMacroStore.setState({ macros: [macro] });

    await useMouseStore.getState().bindMacroToButton(ButtonId.Forward, macro);

    expect(sentFrames()).toEqual([
      [0x81, 0x91, 0x08, 0x03, 0x0c, 0x00, 0x03, 0x02, 0x04, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0xbb],
      [0x81, 0x91, 0x08, 0x03, 0x0c, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00, 0xbf],
    ]);
  });

  it('keeps non-loop repeat types untranslated', async () => {
    const macro = makeMacro({ repeatType: MacroRepeatType.Hold, loopTimes: 7 });
    useMacroStore.setState({ macros: [macro] });

    await useMouseStore.getState().bindMacroToButton(ButtonId.Left, macro);

    const base = { buttonId: ButtonId.Left, macroId: 0, repeatType: MacroRepeatType.Hold };
    expect(sentFrames()).toEqual([
      MouseCommands.setButtonMacro({ ...base, macroButtonType: MacroButtonType.KeyboardDown, delayMs: 0, values: [0x04] }),
      MouseCommands.setButtonMacro({ ...base, macroButtonType: MacroButtonType.KeyUp, delayMs: 0, values: [0x00] }),
    ].map((command) => Array.from(command)));
  });

  it('keeps stable slots across rebinds and other macros being deleted', async () => {
    useDeviceStore.setState({ previewMode: true });
    const macroA = makeMacro({ id: 'macro-a' });
    const macroB = makeMacro({ id: 'macro-b', name: 'Macro B' });
    useMacroStore.setState({ macros: [macroA, macroB] });

    const { bindMacroToButton } = useMouseStore.getState();
    await bindMacroToButton(ButtonId.Forward, macroA);
    await bindMacroToButton(ButtonId.Backward, macroB);
    expect(useMouseStore.getState().macroSlots).toEqual({ 0: 'macro-a', 1: 'macro-b' });
    expect(useMouseStore.getState().buttonConfigs[ButtonId.Backward]).toMatchObject({ index: 1, values: [1] });

    await bindMacroToButton(ButtonId.Left, macroA);
    expect(useMouseStore.getState().buttonConfigs[ButtonId.Left]).toMatchObject({ index: 0, values: [0] });

    useMacroStore.getState().deleteMacro('macro-a');
    expect(useMouseStore.getState().macroSlots).toEqual({ 1: 'macro-b' });

    await bindMacroToButton(ButtonId.Forward, macroB);
    expect(useMouseStore.getState().buttonConfigs[ButtonId.Forward]).toMatchObject({ index: 1, values: [1] });

    // 槽位 0 已释放，但 Left 的设备侧绑定仍指向它，不可复用
    const macroC = makeMacro({ id: 'macro-c', name: 'Macro C' });
    useMacroStore.setState({ macros: [macroB, macroC] });
    await bindMacroToButton(ButtonId.Middle, macroC);
    expect(useMouseStore.getState().buttonConfigs[ButtonId.Middle]).toMatchObject({ index: 2, values: [2] });
    expect(useMouseStore.getState().macroSlots).toEqual({ 1: 'macro-b', 2: 'macro-c' });
    expect(JSON.parse(localStorage.getItem('mouse-hid.macro-slots.v1') ?? '{}')).toEqual({ 1: 'macro-b', 2: 'macro-c' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('reverts to the previous binding and records lastError when the upload fails', async () => {
    const previous = { buttonId: ButtonId.Forward, functionType: KeyFunctionType.Mouse, index: 5, values: [] };
    const macro = makeMacro();
    useMacroStore.setState({ macros: [macro] });
    useMouseStore.setState({ buttonConfigs: { [ButtonId.Forward]: previous } });
    sendMock.mockRejectedValue(new Error('device unplugged'));

    await useMouseStore.getState().bindMacroToButton(ButtonId.Forward, macro);

    const state = useMouseStore.getState();
    expect(state.buttonConfigs[ButtonId.Forward]).toEqual(previous);
    expect(state.lastError).toBe('device unplugged');
    expect(state.macroUploading).toBe(false);
  });

  it('removes the optimistic binding when the button had no previous config', async () => {
    const macro = makeMacro();
    useMacroStore.setState({ macros: [macro] });
    sendMock.mockRejectedValue(new Error('send failed'));

    await useMouseStore.getState().bindMacroToButton(ButtonId.Middle, macro);

    const state = useMouseStore.getState();
    expect(state.buttonConfigs[ButtonId.Middle]).toBeUndefined();
    expect(state.lastError).toBe('send failed');
  });

  it('closes a partially uploaded macro with a terminator and re-reads the button on failure', async () => {
    const macro = makeMacro({
      actions: [
        keyboardAction([0x04, 0x00], MacroDirection.Down, 0),
        keyboardAction([0x04, 0x00], MacroDirection.Up, 100),
      ],
    });
    useMacroStore.setState({ macros: [macro] });
    sendMock
      .mockImplementationOnce(async () => {})
      .mockRejectedValueOnce(new Error('frame lost'));

    await useMouseStore.getState().bindMacroToButton(ButtonId.Forward, macro);

    const frames = sentFrames();
    expect(frames.at(-2)).toEqual(Array.from(MouseCommands.setButtonMacro({
      buttonId: ButtonId.Forward,
      macroId: 0,
      repeatType: 1,
      macroButtonType: MacroButtonType.KeyUp,
      delayMs: 0,
      values: [0x00],
    })));
    expect(frames.at(-1)).toEqual(Array.from(MouseCommands.readButton(ButtonId.Forward)));
    expect(useMouseStore.getState().lastError).toBe('frame lost');
  });

  it('sends the whole macro upload as a single serialized batch', async () => {
    const macro = makeMacro();
    useMacroStore.setState({ macros: [macro] });

    await useMouseStore.getState().bindMacroToButton(ButtonId.Forward, macro);

    expect(sendBatchMock).toHaveBeenCalledTimes(1);
    expect(sendBatchMock.mock.calls[0][0]).toHaveLength(2);
  });
});

describe('write failure recovery', () => {
  it('records lastError and re-reads the device value when a dpi write fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('send failed'));

    await useMouseStore.getState().updateDpi(3200);

    expect(useMouseStore.getState().dpi).toBe(3200);
    expect(useMouseStore.getState().lastError).toBe('send failed');
    expect(sentFrames()).toEqual([
      Array.from(MouseCommands.setDpi(3200)),
      Array.from(MouseCommands.readDpi()),
    ]);
  });

  it('keeps a command failure visible when unrelated valid reports arrive', async () => {
    sendMock.mockRejectedValueOnce(new Error('send failed'));
    await useMouseStore.getState().updateDpi(3200);
    expect(useMouseStore.getState().lastError).toBe('send failed');

    useMouseStore.getState().handleInputReport(buildResponsePacket(ParamType.Profile, [1]));

    expect(useMouseStore.getState().lastError).toBe('send failed');
    expect(useMouseStore.getState().activeProfile).toBe(1);
  });

  it('skips the state refresh and keeps the failure message when resetAll fails', async () => {
    sendMock.mockRejectedValue(new Error('reset failed'));

    await useMouseStore.getState().resetAll();

    expect(useMouseStore.getState().lastError).toBe('reset failed');
  });
});

describe('refreshInitialState', () => {
  it('seeds preview defaults without touching the device in preview mode', async () => {
    useDeviceStore.setState({ previewMode: true });

    await useMouseStore.getState().refreshInitialState();

    expect(sendMock).not.toHaveBeenCalled();
    const { buttonConfigs } = useMouseStore.getState();
    expect(Object.keys(buttonConfigs)).toHaveLength(6);
    expect(buttonConfigs[ButtonId.Left]).toEqual({ buttonId: ButtonId.Left, functionType: KeyFunctionType.Mouse, index: 1, values: [] });
    expect(buttonConfigs[ButtonId.Dpi]).toEqual({ buttonId: ButtonId.Dpi, functionType: KeyFunctionType.DpiAction, index: 0, values: [] });
  });

  it('reads every parameter and button once when the device acks', async () => {
    sendMock.mockImplementation(async (command) => {
      const paramType = command[1];
      switch (paramType) {
        case ParamType.WorkMode:
          emitInput(buildResponsePacket(ParamType.WorkMode, [WorkMode.Wired]));
          break;
        case ParamType.Version:
          emitInput(buildResponsePacket(ParamType.Version, [0x00, ...versionCodes('v2.0')]));
          break;
        case ParamType.Profile:
          emitInput(buildResponsePacket(ParamType.Profile, [0]));
          break;
        case ParamType.Dpi:
          emitInput(buildResponsePacket(ParamType.Dpi, [0x06, 0x40]));
          break;
        case ParamType.Button:
          emitInput(buildResponsePacket(ParamType.Button, [command[3], KeyFunctionType.Mouse, 1]));
          break;
      }
    });

    await useMouseStore.getState().refreshInitialState();

    expect(sentFrames()).toEqual([
      MouseCommands.readWorkMode(),
      MouseCommands.readVersion(0),
      MouseCommands.readProfile(),
      MouseCommands.readDpi(),
      MouseCommands.readButton(ButtonId.Left),
      MouseCommands.readButton(ButtonId.Right),
      MouseCommands.readButton(ButtonId.Middle),
      MouseCommands.readButton(ButtonId.Forward),
      MouseCommands.readButton(ButtonId.Backward),
      MouseCommands.readButton(ButtonId.Dpi),
    ].map((command) => Array.from(command)));
    expect(useMouseStore.getState().deviceUnresponsive).toBe(false);
  });

  it('marks the device unresponsive when every send rejects', async () => {
    sendMock.mockRejectedValue(new Error('no device'));

    await useMouseStore.getState().refreshInitialState();

    expect(sendMock).toHaveBeenCalledTimes(10);
    expect(useMouseStore.getState().deviceUnresponsive).toBe(true);
  });

  it('retries once per read and flags the device unresponsive when acks never arrive', async () => {
    vi.useFakeTimers();

    const refresh = useMouseStore.getState().refreshInitialState();
    await vi.runAllTimersAsync();
    await refresh;

    expect(sendMock).toHaveBeenCalledTimes(20);
    expect(useMouseStore.getState().deviceUnresponsive).toBe(true);
  });
});
