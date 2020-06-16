import { concatUint8Array, readInt32BE } from "./util.ts";

interface Options {
  headerSize?: number;
  lengthSize?: number;
}

export default class Reader {
  #header!: string;
  #length!: number;
  private offset = 0;
  private chunk: Uint8Array;
  private chunkLength: number = 0;
  private headerSize: number;
  private lengthSize: number;
  private decoder = new TextDecoder();

  constructor(chunk: Uint8Array, options?: Options) {
    this.chunk = chunk;
    this.chunkLength = chunk.byteLength;
    this.headerSize = options?.headerSize ?? 1;
    this.lengthSize = options?.lengthSize ?? 4;
  }

  get header() {
    return this.#header;
  }

  get length() {
    return this.#length;
  }

  addChunk(chunk: Uint8Array) {
    this.chunk = concatUint8Array([this.chunk, chunk]);
    this.chunkLength += chunk.byteLength;
  }

  read(): Uint8Array | null {
    if (
      this.chunkLength < this.headerSize + this.lengthSize + this.offset
    ) {
      return null;
    }

    this.#header = this.decoder.decode(
      this.chunk.subarray(this.offset, this.offset += this.headerSize),
    );
    this.#length = readInt32BE(this.chunk, this.offset);
    const remaining = this.chunkLength - this.offset;
    if (this.#length > remaining) return null;

    const result = this.chunk.subarray(
      this.offset + this.lengthSize,
      this.offset + this.#length,
    );
    this.offset += this.#length;

    return result;
  }
}
