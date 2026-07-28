import { computeDataCrc, computePacketCrc } from './crc';
import {
  ButtonId,
  KeyFunctionType,
  ParamType,
  ParsedMouseResponse,
  WorkMode,
} from './types';

function numericEnumValues(enumObj: Record<string, string | number>): Set<number> {
  return new Set(Object.values(enumObj).filter((value): value is number => typeof value === 'number'));
}

const BUTTON_IDS = numericEnumValues(ButtonId);
const KEY_FUNCTION_TYPES = numericEnumValues(KeyFunctionType);
const WORK_MODES = numericEnumValues(WorkMode);

export function parseMouseResponse(packetLike: ArrayLike<number>): ParsedMouseResponse {
  const packet = Array.from(packetLike);
  if (packet.length !== 17 || packet[0] !== 0x09) {
    throw new Error(`Invalid mouse packet format: ${packet.length} bytes`);
  }

  const packetCrc = computePacketCrc(packet.slice(0, 16));
  if (packetCrc !== packet[16]) {
    throw new Error('Mouse packet CRC check failed');
  }

  const paramType = packet[2] as ParamType;
  const dataLength = packet[3];
  const data = packet.slice(4, 4 + dataLength);
  const dataCrc = packet[4 + dataLength];
  if (computeDataCrc(data) !== dataCrc) {
    throw new Error('Mouse packet data CRC mismatch');
  }

  switch (paramType) {
    case ParamType.Dpi:
      return { type: ParamType.Dpi, dpi: ((data[0] ?? 0) << 8) | (data[1] ?? 0) };
    case ParamType.Button: {
      const buttonId = data[0] ?? -1;
      const functionType = data[1] ?? -1;
      // 设备字节越界时不强转枚举，退回 None 避免污染 store 状态
      if (!BUTTON_IDS.has(buttonId) || !KEY_FUNCTION_TYPES.has(functionType)) {
        return { type: ParamType.None, rawData: data };
      }
      return {
        type: ParamType.Button,
        buttonId: buttonId as ButtonId,
        functionType: functionType as KeyFunctionType,
        index: data[2] ?? 0,
        values: data.slice(3),
      };
    }
    case ParamType.Profile:
      return { type: ParamType.Profile, profile: data[0] ?? 0 };
    case ParamType.Version:
      return {
        type: ParamType.Version,
        deviceType: data[0] === 0 ? 'mouse' : 'receiver',
        version: String.fromCharCode(...data.slice(1)).replace(/\x00/g, ''),
      };
    case ParamType.WorkMode: {
      const mode = data[0] ?? -1;
      if (!WORK_MODES.has(mode)) return { type: ParamType.None, rawData: data };
      return { type: ParamType.WorkMode, mode: mode as WorkMode };
    }
    default:
      return { type: ParamType.None, rawData: data };
  }
}
