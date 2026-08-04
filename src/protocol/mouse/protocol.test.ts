import { describe, expect, it } from 'vitest';
import { browserKeyToHid, ButtonId, computePacketCrc, keyGroups, KeyFunctionType, MacroButtonType, MouseCommands, ParamType, parseMouseResponse } from '@/protocol/mouse';

function findOptionValue(label: string): number | undefined {
  for (const group of keyGroups) {
    const option = group.options.find((item) => item.label === label);
    if (option) return option.values[0];
  }
  return undefined;
}

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

  it('writes one-byte keyboard usages without an undocumented padding value', () => {
    const keyA = keyGroups.flatMap((group) => group.options).find((option) => option.id === 'key-A');
    expect(keyA?.values).toEqual([0x04]);
    const command = MouseCommands.setButtonMapping({
      buttonId: ButtonId.Right,
      functionType: keyA!.functionType,
      index: keyA!.index,
      values: keyA!.values,
    });
    expect(command[2]).toBe(4);
    expect(Array.from(command.slice(3, 7))).toEqual([ButtonId.Right, KeyFunctionType.Alphanumeric, keyA!.index, 0x04]);
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

  it('rejects invalid command values instead of silently truncating them', () => {
    expect(() => MouseCommands.switchProfile(4)).toThrow(/Profile id/);
    expect(() => MouseCommands.setButtonMapping({
      buttonId: ButtonId.Left,
      functionType: KeyFunctionType.Alphanumeric,
      index: 0,
      values: [],
    })).toThrow(/requires 1 value byte/);
    expect(() => MouseCommands.setButtonMapping({
      buttonId: ButtonId.Left,
      functionType: KeyFunctionType.ComboKey,
      index: 0,
      values: Array(9).fill(0xe0),
    })).toThrow(/requires 1-8 value byte/);
    expect(() => MouseCommands.setButtonMacro({
      buttonId: ButtonId.Left,
      macroId: 0,
      repeatType: 0xf0,
      macroButtonType: MacroButtonType.KeyboardDown,
      delayMs: 1.5,
      values: [0x04],
    })).toThrow(/Macro delay/);
  });

  it('rejects packets with invalid CRC', () => {
    const packet = [0x09, 0x81, 0x90, 0x02, 0x06, 0x40, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    expect(() => parseMouseResponse(packet)).toThrow(/CRC/);
  });

  it('rejects packets whose declared data length overflows the frame', () => {
    // 声明的数据长度 0x0c 超过帧容量(最多 11 字节)；先让 packet-CRC 合法以确保命中长度校验
    const packet = [0x09, 0x81, 0x90, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    packet[16] = computePacketCrc(packet.slice(0, 16));
    expect(() => parseMouseResponse(packet)).toThrow(/data length/);
  });

  it('rejects read commands and semantically invalid response lengths', () => {
    const readPacket = [0x09, 0x80, 0x90, 0x02, 0x06, 0x40, 0x46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    readPacket[16] = computePacketCrc(readPacket.slice(0, 16));
    expect(() => parseMouseResponse(readPacket)).toThrow(/command type/);

    const shortDpi = [0x09, 0x81, 0x90, 0x01, 0x06, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    shortDpi[16] = computePacketCrc(shortDpi.slice(0, 16));
    expect(() => parseMouseResponse(shortDpi)).toThrow(/response length/);
  });

  it('rejects semantically unsupported DPI and reset responses', () => {
    const unsupportedDpi = [0x09, 0x81, 0x90, 0x02, 0x04, 0xd2, 0xd6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    unsupportedDpi[16] = computePacketCrc(unsupportedDpi.slice(0, 16));
    expect(() => parseMouseResponse(unsupportedDpi)).toThrow(/Unsupported DPI/);

    const invalidReset = [0x09, 0x81, 0x93, 0x01, 0x03, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    invalidReset[16] = computePacketCrc(invalidReset.slice(0, 16));
    expect(() => parseMouseResponse(invalidReset)).toThrow(/reset type/);
  });

  it('maps Caps Lock and Num Lock to their correct USB HID usage codes', () => {
    // 回归保护：Caps Lock=0x39、Num Lock=0x53，且不得与小键盘 '/'(0x54) 撞码
    expect(findOptionValue('Caps Lock')).toBe(0x39);
    expect(findOptionValue('Num Lock')).toBe(0x53);
    expect(findOptionValue('/')).toBe(0x54);
  });

  it('distinguishes left and right modifiers via event.code', () => {
    expect(browserKeyToHid['ControlLeft']?.[0]).toBe(0xe0);
    expect(browserKeyToHid['ControlRight']?.[0]).toBe(0xe4);
    expect(browserKeyToHid['ShiftLeft']?.[0]).toBe(0xe1);
    expect(browserKeyToHid['ShiftRight']?.[0]).toBe(0xe5);
    expect(browserKeyToHid['AltRight']?.[0]).toBe(0xe6);
    expect(browserKeyToHid['MetaRight']?.[0]).toBe(0xe7);
  });

  it('maps physical event.code values for shifted, function, and numpad keys', () => {
    expect(browserKeyToHid['Digit1']).toEqual([0x1e]);
    expect(browserKeyToHid['Slash']).toEqual([0x38]);
    expect(browserKeyToHid['F12']).toEqual([0x45]);
    expect(browserKeyToHid['Numpad7']).toEqual([0x5f]);
    expect(browserKeyToHid['PageDown']).toEqual([0x4e]);
  });
});
