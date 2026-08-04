import { computeDataCrc, computePacketCrc } from './crc';
import {
  ButtonId,
  CommandType,
  KeyFunctionType,
  MacroButtonType,
  MouseCommand,
  ParamType,
} from './types';

const REPORT_ID = 0x09;
const PACKET_SIZE = 17;
const PAYLOAD_SIZE = PACKET_SIZE - 1;
const MAX_DATA_SIZE = 11;

function assertIntegerInRange(name: string, value: number, min = 0, max = 0xff) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer between ${min} and ${max}: ${value}`);
  }
}

function assertButtonId(buttonId: ButtonId) {
  assertIntegerInRange('Button id', buttonId, ButtonId.Left, ButtonId.Dpi);
}

function assertMappingValues(functionType: KeyFunctionType, values: number[]) {
  let min = 0;
  let max = 0;
  switch (functionType) {
    case KeyFunctionType.Alphanumeric:
    case KeyFunctionType.FunctionKey:
    case KeyFunctionType.Numpad:
    case KeyFunctionType.ControlKey:
      min = 1;
      max = 1;
      break;
    case KeyFunctionType.Multimedia:
    case KeyFunctionType.BurstFire:
      min = 2;
      max = 2;
      break;
    case KeyFunctionType.ComboKey:
      min = 1;
      max = 8;
      break;
    case KeyFunctionType.Macro:
      throw new Error('Macro mappings must be written with setButtonMacro().');
    default:
      break;
  }
  if (values.length < min || values.length > max) {
    const expected = min === max ? String(min) : `${min}-${max}`;
    throw new Error(`Function type ${functionType} requires ${expected} value byte(s), received ${values.length}.`);
  }
}

function buildCommand(commandType: CommandType, paramType: ParamType, data: number[] = []): MouseCommand {
  if (data.length > MAX_DATA_SIZE) {
    throw new Error(`Mouse command payload is too large: ${data.length} bytes`);
  }
  data.forEach((value, index) => assertIntegerInRange(`Data byte ${index}`, value));

  const packet = new Array(PACKET_SIZE).fill(0);
  packet[0] = REPORT_ID;
  packet[1] = commandType;
  packet[2] = paramType;
  packet[3] = data.length;
  data.forEach((value, index) => {
    packet[4 + index] = value;
  });
  packet[4 + data.length] = computeDataCrc(data);
  packet[16] = computePacketCrc(packet.slice(0, 16));

  return Uint8Array.from(packet.slice(1, PACKET_SIZE));
}

const dpiBytes: Record<number, [number, number]> = {
  800: [0x03, 0x20],
  1600: [0x06, 0x40],
  3200: [0x0c, 0x80],
  4000: [0x0f, 0xa0],
  6000: [0x17, 0x70],
  8000: [0x1f, 0x40],
};

export const MouseCommands = {
  reportId: REPORT_ID,
  payloadSize: PAYLOAD_SIZE,
  buildCommand,
  readDpi: () => buildCommand(CommandType.Read, ParamType.Dpi),
  setDpi: (dpi: number) => {
    const bytes = dpiBytes[dpi];
    if (!bytes) throw new Error(`Unsupported DPI value: ${dpi}`);
    return buildCommand(CommandType.Write, ParamType.Dpi, bytes);
  },
  readButton: (buttonId: ButtonId) => {
    assertButtonId(buttonId);
    return buildCommand(CommandType.Read, ParamType.Button, [buttonId]);
  },
  setButtonMapping: ({ buttonId, functionType, index, values }: {
    buttonId: ButtonId;
    functionType: KeyFunctionType;
    index: number;
    values?: number[];
  }) => {
    assertButtonId(buttonId);
    assertIntegerInRange('Function type', functionType, KeyFunctionType.Default, KeyFunctionType.Macro);
    assertIntegerInRange('Function index', index);
    const mappingValues = values ?? [];
    assertMappingValues(functionType, mappingValues);
    const data = functionType === KeyFunctionType.Default
      ? [buttonId, functionType]
      : [buttonId, functionType, index, ...mappingValues];
    return buildCommand(CommandType.Write, ParamType.Button, data);
  },
  setButtonMacro: ({
    buttonId,
    macroId,
    repeatType,
    macroButtonType,
    delayMs,
    values,
  }: {
    buttonId: ButtonId;
    macroId: number;
    repeatType: number;
    macroButtonType: MacroButtonType;
    delayMs: number;
    values: number[];
  }) => {
    assertButtonId(buttonId);
    assertIntegerInRange('Macro id', macroId);
    assertIntegerInRange('Macro repeat type', repeatType, 1);
    assertIntegerInRange('Macro button type', macroButtonType, MacroButtonType.KeyUp, MacroButtonType.KeyboardDown);
    assertIntegerInRange('Macro delay', delayMs, 0, 0xffff);
    if (values.length !== 1) throw new Error(`Macro frames require exactly 1 value byte, received ${values.length}.`);
    const high = Math.floor(delayMs / 0x100);
    const low = delayMs % 0x100;
    return buildCommand(CommandType.Write, ParamType.Button, [
      buttonId,
      KeyFunctionType.Macro,
      macroId,
      repeatType,
      macroButtonType,
      ...values,
      high,
      low,
    ]);
  },
  readProfile: () => buildCommand(CommandType.Read, ParamType.Profile),
  switchProfile: (profileId: number) => {
    assertIntegerInRange('Profile id', profileId, 0, 3);
    return buildCommand(CommandType.Write, ParamType.Profile, [profileId]);
  },
  readVersion: (deviceType: 0 | 1) => buildCommand(CommandType.Read, ParamType.Version, [deviceType]),
  readWorkMode: () => buildCommand(CommandType.Read, ParamType.WorkMode),
  resetAll: () => buildCommand(CommandType.Write, ParamType.Reset, [0]),
  resetButtons: () => buildCommand(CommandType.Write, ParamType.Reset, [1]),
};
