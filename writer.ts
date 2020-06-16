const encoder = new TextEncoder();

export default class Writer {
  readonly buffer: Uint8Array;
  private offset: number = 0;

  constructor(size: number) {
    this.buffer = new Uint8Array(size);
  }

  static getSize(headerSize: number, body: object): number {
    let size = headerSize + 1;
    const bodyStr = Object.entries(body).reduce(
      (pre, next) => pre + next.join(""),
      "",
    );
    size += encoder.encode(bodyStr).byteLength +
      Object.keys(body).length * 2;
    return size;
  }

  writeHeader(value: string): this {
    this.buffer.set(encoder.encode(value));
    this.offset++;
    return this;
  }

  writeInt32(value: number): this {
    this.buffer[this.offset++] = (value >>> 24) & 0xff;
    this.buffer[this.offset++] = (value >>> 16) & 0xff;
    this.buffer[this.offset++] = (value >>> 8) & 0xff;
    this.buffer[this.offset++] = (value >>> 0) & 0xff;
    return this;
  }

  writeInt16(value: number): this {
    this.buffer[this.offset++] = (value >>> 8) & 0xff;
    this.buffer[this.offset++] = (value >>> 0) & 0xff;
    return this;
  }

  writeBody(body: object): this {
    for (const [key, val] of Object.entries(body)) {
      const encodedkey = encoder.encode(key);
      this.buffer.set(encodedkey, this.offset);
      this.offset += encodedkey.byteLength;
      this.buffer[this.offset++] = 0;

      const encodedVal = encoder.encode(val);
      this.buffer.set(encodedVal, this.offset);
      this.offset += encodedVal.byteLength;
      this.buffer[this.offset++] = 0;
    }
    return this;
  }

  writeStr(str: string): this {
    const encodedStr = encoder.encode(str);
    this.buffer.set(encodedStr, this.offset);
    this.offset += encodedStr.byteLength;
    return this;
  }

  write(buf: Uint8Array): this {
    this.buffer.set(buf, this.offset);
    this.offset += buf.byteLength;
    return this;
  }
}
