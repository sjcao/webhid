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

  it('rejects packets whose declared data length overflows the frame', () => {
    // 声明的数据长度 0x0c 超过帧容量(最多 11 字节)；先让 packet-CRC 合法以确保命中长度校验
    const packet = [0x09, 0x81, 0x90, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    packet[16] = computePacketCrc(packet.slice(0, 16));
    expect(() => parseMouseResponse(packet)).toThrow(/data length/);
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
});
