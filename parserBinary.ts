import { readUInt16BE, readInt32BE, readUInt32BE } from "./util.ts";
const map = new Map();
const decoder = new TextDecoder();

map.set(20, (buf: Uint8Array) => BigInt(decoder.decode(buf)));
map.set(21, (buf: Uint8Array) => readUInt16BE(buf));
map.set(23, (buf: Uint8Array) => readInt32BE(buf));
map.set(26, (buf: Uint8Array) => readInt32BE(buf));
// map.set(700, (buf: Uint8Array) => buf.readFloatBE());
// map.set(701, (buf: Uint8Array) => buf.readDoubleBE());
map.set(16, (buf: Uint8Array) => {
  if (buf === null) return null;
  return buf[0] !== 0;
});
const parseDate = function (isUTC: boolean, buf: Uint8Array) {
  const rawValue = 0x100000000 * readInt32BE(buf) + readUInt32BE(buf);
  // discard usecs and shift from 2000 to 1970
  const date = new Date((rawValue / 1000) + 946684800000);
  if (!isUTC) {
    date.setTime(date.getTime() + date.getTimezoneOffset() * 60000);
  }
  return date;
};
map.set(1114, parseDate.bind(null, false));
map.set(1184, parseDate.bind(null, true));
map.set(25, (buf: Uint8Array) => decoder.decode(buf));

export default map;
