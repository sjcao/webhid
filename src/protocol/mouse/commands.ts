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

function buildCommand(commandType: CommandType, paramType: ParamType, data: number[] = []): MouseCommand {
  if (data.length > 11) {
    throw new Error(`Mouse command payload is too large: ${data.length} bytes`);
  }

  const packet = new Array(PACKET_SIZE).fill(0);
  packet[0] = REPORT_ID;
  packet[1] = commandType;
  packet[2] = paramType;
  packet[3] = data.length;
  data.forEach((value, index) => {
    packet[4 + index] = value & 0xff;
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
  readButton: (buttonId: ButtonId) => buildCommand(CommandType.Read, ParamType.Button, [buttonId]),
  setButtonMapping: ({ buttonId, functionType, index, values }: {
    buttonId: ButtonId;
    functionType: KeyFunctionType;
    index: number;
    values?: number[];
  }) => {
    const data = functionType === KeyFunctionType.Default
      ? [buttonId, functionType]
      : [buttonId, functionType, index, ...(values ?? [])];
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
    const high = (delayMs >> 8) & 0xff;
    const low = delayMs & 0xff;
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
  switchProfile: (profileId: number) => buildCommand(CommandType.Write, ParamType.Profile, [profileId]),
  readVersion: (deviceType: 0 | 1) => buildCommand(CommandType.Read, ParamType.Version, [deviceType]),
  readWorkMode: () => buildCommand(CommandType.Read, ParamType.WorkMode),
  resetAll: () => buildCommand(CommandType.Write, ParamType.Reset, [0]),
  resetButtons: () => buildCommand(CommandType.Write, ParamType.Reset, [1]),
};
