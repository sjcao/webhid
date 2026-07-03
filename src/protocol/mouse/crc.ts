export function computePacketCrc(bytes: readonly number[]) {
  const sum = bytes.reduce((total, value) => total + value, 0);
  return (0x00 - (sum & 0xff)) & 0xff;
}

export function computeDataCrc(data: readonly number[]) {
  return data.length ? data.reduce((total, value) => total ^ value, 0) : 0;
}
