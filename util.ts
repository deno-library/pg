import { Md5 } from "./deps.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function md5(str: string | ArrayBuffer): string {
  return new Md5().update(str).toString();
}

export function Md5Password(
  user: string,
  password: string,
  salt: Uint8Array,
): string {
  const val = md5(password + user);
  const md5WithSalt = md5(concatUint8Array([encoder.encode(val), salt]));
  return "md5" + md5WithSalt;
}

export async function readMsg(reader: Deno.Reader): Promise<Uint8Array | null> {
  const arr: Uint8Array[] = [];
  const n = 1000;
  let readed: number | null;
  while (true) {
    const p: Uint8Array = new Uint8Array(n);
    readed = await reader.read(p);
    if (readed === null) break;
    if (readed < n) {
      arr.push(p.subarray(0, readed));
      break;
    } else {
      arr.push(p);
    }
  }
  if (readed === null) return readed;
  const result = concatUint8Array(arr);
  return result;
}

export function concatUint8Array(arr: Uint8Array[]): Uint8Array {
  const length = arr.reduce((pre, next) => pre + next.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const v of arr) {
    result.set(v, offset);
    offset += v.length;
  }
  return result;
}

export function readUInt16BE(buffer: Uint8Array, offset: number = 0): number {
  offset = offset >>> 0;
  return buffer[offset] | (buffer[offset + 1] << 8);
}

export function readInt32BE(buffer: Uint8Array, offset: number = 0): number {
  offset = offset >>> 0;

  return (
    (buffer[offset] << 24) |
    (buffer[offset + 1] << 16) |
    (buffer[offset + 2] << 8) |
    buffer[offset + 3]
  );
}

export function readUInt32BE(buffer: Uint8Array, offset: number = 0): number {
  offset = offset >>> 0;

  return (
    buffer[offset] * 0x1000000 +
    ((buffer[offset + 1] << 16) |
      (buffer[offset + 2] << 8) |
      buffer[offset + 3])
  );
}
