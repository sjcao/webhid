import { computeDataCrc, computePacketCrc } from './crc';
import {
  ButtonId,
  CommandType,
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
const DPI_VALUES = new Set([800, 1600, 3200, 4000, 6000, 8000]);

function requireDataLength(paramType: ParamType, data: number[], min: number, max = min) {
  if (data.length < min || data.length > max) {
    const expected = min === max ? String(min) : `${min}-${max}`;
    throw new Error(`Invalid ${ParamType[paramType] ?? 'mouse'} response length: expected ${expected}, got ${data.length}`);
  }
}

export function parseMouseResponse(packetLike: ArrayLike<number>): ParsedMouseResponse {
  const packet = Array.from(packetLike);
  if (packet.length !== 17 || packet[0] !== 0x09) {
    throw new Error(`Invalid mouse packet format: ${packet.length} bytes`);
  }
  if (packet[1] !== CommandType.Write) {
    throw new Error(`Invalid mouse response command type: 0x${packet[1].toString(16).padStart(2, '0')}`);
  }

  const packetCrc = computePacketCrc(packet.slice(0, 16));
  if (packetCrc !== packet[16]) {
    throw new Error('Mouse packet CRC check failed');
  }

  const paramType = packet[2] as ParamType;
  const dataLength = packet[3];
  // data 占索引 4..14，其后紧跟 data-CRC(15) 与 packet-CRC(16)，最多 11 字节；
  // 越界的长度字段说明报文畸形，直接拒绝，避免越界读取和错位比对 data-CRC
  if (dataLength > 11) {
    throw new Error(`Invalid mouse data length: ${dataLength}`);
  }
  const data = packet.slice(4, 4 + dataLength);
  const dataCrc = packet[4 + dataLength];
  if (computeDataCrc(data) !== dataCrc) {
    throw new Error('Mouse packet data CRC mismatch');
  }

  switch (paramType) {
    case ParamType.Dpi:
      requireDataLength(paramType, data, 2);
      {
        const dpi = ((data[0] ?? 0) << 8) | (data[1] ?? 0);
        if (!DPI_VALUES.has(dpi)) throw new Error(`Unsupported DPI response: ${dpi}`);
        return { type: ParamType.Dpi, dpi };
      }
    case ParamType.Button: {
      requireDataLength(paramType, data, 2, 11);
      const buttonId = data[0] ?? -1;
      const functionType = data[1] ?? -1;
      if (!BUTTON_IDS.has(buttonId) || !KEY_FUNCTION_TYPES.has(functionType)) {
        throw new Error(`Invalid button response values: button=${buttonId}, function=${functionType}`);
      }
      if (functionType === KeyFunctionType.Default) requireDataLength(paramType, data, 2);
      else requireDataLength(paramType, data, 3, 11);
      return {
        type: ParamType.Button,
        buttonId: buttonId as ButtonId,
        functionType: functionType as KeyFunctionType,
        index: data[2] ?? 0,
        values: data.slice(3),
      };
    }
    case ParamType.Profile: {
      requireDataLength(paramType, data, 1);
      const profile = data[0];
      if (profile > 3) throw new Error(`Invalid onboard profile: ${profile}`);
      return { type: ParamType.Profile, profile };
    }
    case ParamType.Reset:
      requireDataLength(paramType, data, 1);
      if (data[0] > 2) throw new Error(`Invalid reset type: ${data[0]}`);
      return { type: ParamType.Reset, resetType: data[0] };
    case ParamType.Version:
      requireDataLength(paramType, data, 2, 11);
      if (data[0] !== 0 && data[0] !== 1) throw new Error(`Invalid version device type: ${data[0]}`);
      return {
        type: ParamType.Version,
        deviceType: data[0] === 0 ? 'mouse' : 'receiver',
        version: String.fromCharCode(...data.slice(1)).replace(/\x00/g, ''),
      };
    case ParamType.WorkMode: {
      requireDataLength(paramType, data, 1);
      const mode = data[0] ?? -1;
      if (!WORK_MODES.has(mode)) throw new Error(`Invalid work mode: ${mode}`);
      return { type: ParamType.WorkMode, mode: mode as WorkMode };
    }
    default:
      return { type: ParamType.None, rawData: data };
  }
}
