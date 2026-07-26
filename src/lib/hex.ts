export function toHexByte(value: number) {
  return value.toString(16).padStart(2, '0').toUpperCase();
}

export function toHexString(bytes: Iterable<number>) {
  return Array.from(bytes, toHexByte).join(' ');
}

export function formatUsbId(value: number) {
  return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;
}
