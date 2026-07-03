import { describe, expect, it } from 'vitest';
import { ButtonId, KeyFunctionType, MacroButtonType, MouseCommands, ParamType, parseMouseResponse } from '@/protocol/mouse';

describe('mouse protocol', () => {
  it('builds a 16-byte HID payload with report id omitted for sendReport', () => {
    const command = MouseCommands.setDpi(1600);
    expect(command).toHaveLength(16);
    expect(command[0]).toBe(0x81);
    expect(command[1]).toBe(ParamType.Dpi);
    expect(command[2]).toBe(2);
    expect(Array.from(command.slice(3, 5))).toEqual([0x06, 0x40]);
  });

  it('parses a valid DPI response packet', () => {
    const packet = [0x09, 0x81, 0x90, 0x02, 0x06, 0x40, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x58];
    expect(parseMouseResponse(packet)).toEqual({ type: ParamType.Dpi, dpi: 1600 });
  });

  it('supports the fixed DPI stages from the current protocol document', () => {
    const command = MouseCommands.setDpi(8000);
    expect(Array.from(command.slice(3, 5))).toEqual([0x1f, 0x40]);
  });

  it('writes default button mapping as a short payload', () => {
    const command = MouseCommands.setButtonMapping({
      buttonId: ButtonId.Middle,
      functionType: KeyFunctionType.Default,
      index: 0,
    });

    expect(command[2]).toBe(2);
    expect(Array.from(command.slice(3, 5))).toEqual([ButtonId.Middle, KeyFunctionType.Default]);
  });

  it('writes macro frames with the protocol macro type', () => {
    const command = MouseCommands.setButtonMacro({
      buttonId: ButtonId.Forward,
      macroId: 1,
      repeatType: 0xf0,
      macroButtonType: MacroButtonType.KeyboardDown,
      delayMs: 100,
      values: [0x04],
    });

    expect(command[2]).toBe(8);
    expect(Array.from(command.slice(3, 11))).toEqual([ButtonId.Forward, KeyFunctionType.Macro, 1, 0xf0, MacroButtonType.KeyboardDown, 0x04, 0x00, 0x64]);
  });

  it('rejects packets with invalid CRC', () => {
    const packet = [0x09, 0x81, 0x90, 0x02, 0x06, 0x40, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    expect(() => parseMouseResponse(packet)).toThrow(/CRC/);
  });
});
