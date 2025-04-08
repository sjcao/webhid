
export function toHexString(byteArray: number[]) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join(' ')
}
export function fromHexString(hexString: string) {
  hexString = hexString.replace(/ /g, '').replace(/\n/g, '');
  console.log(hexString);
  if (hexString.length % 2 !== 0) {
    hexString = hexString.slice(0, hexString.length - 1) + '0' + hexString.slice(hexString.length - 1, hexString.length);
  }
  const byteArray = [];
  for (let i = 0; i < hexString.length; i += 2) {
    const byte = parseInt(hexString.slice(i, i + 2), 16);
    byteArray.push(byte);
  }
  return byteArray;
}