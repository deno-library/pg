import { readInt16BE, readInt32BE } from "./util.ts";

const TEXT_MODE = 0;
const BINARY_MODE = 1;

interface Param {
  chunk: Uint8Array;
  length: number;
  header: string;
}

export default class Message {
  private chunk: Uint8Array;
  private length: number;
  private header: string;
  private offset = 0;
  private mode = TEXT_MODE;
  private decoder = new TextDecoder();

  [propName: string]: any

  constructor({ chunk, length, header }: Param) {
    this.chunk = chunk;
    this.length = length;
    this.header = header;
    this.parseMessage();
  }

  parseMessage() {
    switch (this.header) {
      case "R":
        return this.parseR();
      case "E":
        return this.parseE();
      case "T":
        return this.parseT();
      case "S":
        return this.parseS();
      case "K":
        return this.parseK();
      case "Z":
        return this.parseZ();
      case "D":
        return this.parseD();
      case "C":
        return this.parseC();
      case "N":
        return this.parseN();
      default:
        throw new Error(`Unprocessed header: ${this.header}`);
    }
  }

  /**
   * 
   */
  parseN() {
    this.name = "NoticeResponse";
    while (true) {
      const byte = this.readBytes(1);
      if (byte[0] === 0) break;
      const type = this.decoder.decode(byte);
      const msg = this.readZeroString();
      switch (type) {
        // can be: S,V,C,M,D,H,P,p,q,W,s,t,c,d,n,F,L,R
        // from https://www.postgresql.org/docs/current/protocol-error-fields.html
        case "M":
          this.text = msg;
          break;
          // case "R":
          //   // Routine: the name of the source-code routine reporting the error.
          //   break;
          // default:
          //   console.log(byte, type, msg);
      }
    }
  }

  /**
   * CommandComplete
   * Identifies the message as a command-completed response
   */
  parseC() {
    this.name = "CommandComplete";
    this.text = this.readZeroString();
  }

  /**
   * DataRow 
   * Identifies the message as a data row.
   */
  parseD() {
    this.name = "DataRow";
    const fieldCount = this.readInt16();
    const fields = [];

    for (let i = 0; i < fieldCount; i++) {
      const length = this.readInt32();
      if (length === -1) {
        fields.push(null);
      } else if (this.mode === TEXT_MODE) {
        fields.push(this.readString(length));
      } else {
        fields.push(this.readBytes(length));
      }
    }

    this.fields = fields;
  }

  /**
   * ReadyForQuery
   * Identifies the message type. 
   * ReadyForQuery is sent whenever the backend is ready for a new query cycle.
   */
  parseZ() {
    this.name = "ReadyForQuery";
    /**
     * Current backend transaction status indicator. 
     * Possible values are 'I' if idle (not in a transaction block); 
     * 'T' if in a transaction block; 
     * or 'E' if in a failed transaction block (queries will be rejected until block is ended).
     */
    this.status = this.readString(1);
  }

  /**
   * 
   * Identifies the message as cancellation key data. 
   * The frontend must save these values if it wishes to be able to issue CancelRequest messages later.
   */
  parseK() {
    this.name = "BackendKeyData";
    this.processID = this.readInt32();
    this.secretKey = this.readInt32();
  }

  /**
   * ParameterStatus 
   * Identifies the message as a run-time parameter status report
   */
  parseS() {
    this.name = "ParameterStatus";
    this.parameterName = this.readZeroString();
    this.parameterValue = this.readZeroString();
  }

  /**
   * Authentication related
   * Identifies the message as an authentication request
   */
  parseR() {
    const code = this.readInt32();

    switch (code) {
      case 0:
        this.name = "AuthenticationOk";
        this.message = this.decoder.decode(this.chunk);
        break;
      case 3:
        if (this.length === 8) {
          this.name = "AuthenticationCleartextPassword";
        } else {
          this.name = `parseR code 3, length expect 8, get ${this.length}`;
        }
        break;
      case 5:
        if (this.length === 12) {
          this.name = "AuthenticationMD5Password";
          this.salt = this.chunk.subarray(this.offset, this.offset + 4);
        } else {
          this.name = `parseR code 5, length expect 12, get ${this.length}`;
        }
        break;
      default:
        throw new Error(
          `Unknown Authentication type, code: ${code}, message: ${
            this.decoder.decode(
              this.chunk.subarray(this.offset, this.offset + 4),
            )
          }`,
        );
    }
  }

  /**
   * RowDescription 
   * Identifies the message as a row description
   */
  parseT() {
    this.name = "RowDescription";

    const fieldCount = this.readInt16();

    const fields = [];
    for (let i = 0; i < fieldCount; i++) {
      const name = this.readZeroString();
      const tableID = this.readInt32();
      const columnID = this.readInt16();
      const dataTypeID = this.readInt32();
      const dataTypeSize = this.readInt16();
      const dataTypeModifier = this.readInt32();
      const mode = this.readInt16();
      this.mode = mode === TEXT_MODE ? TEXT_MODE : BINARY_MODE;
      // Currently will be zero (text) or one (binary).
      const format = mode === TEXT_MODE ? "text" : "binary";

      fields.push({
        name,
        tableID,
        columnID,
        dataTypeID,
        dataTypeSize,
        dataTypeModifier,
        format,
      });
    }

    this.fields = fields;
  }

  /**
   * ErrorResponse 
   * Identifies the message as an error
   */
  parseE() {
    this.name = "error";

    const fields: Record<string, unknown> = {};

    let fieldType = this.readString(1);

    while (fieldType !== "\0") {
      fields[fieldType] = this.readZeroString();
      fieldType = this.readString(1);
    }

    this.message = fields.M;
    this.severity = fields.S;
    this.code = fields.C;
    this.detail = fields.D;
    this.hint = fields.H;
    this.position = fields.P;
    this.internalPosition = fields.p;
    this.internalQuery = fields.q;
    this.where = fields.W;
    this.schema = fields.s;
    this.table = fields.t;
    this.column = fields.c;
    this.dataType = fields.d;
    this.constraint = fields.n;
    this.file = fields.F;
    this.line = fields.L;
    this.routine = fields.R;
  }

  readInt16(): number {
    const value = readInt16BE(this.chunk, this.offset);
    this.offset += 2;
    return value;
  }

  readInt32(): number {
    const value = readInt32BE(this.chunk, this.offset);
    this.offset += 4;
    return value;
  }

  readString(length: number): string {
    return this.decoder.decode(this.readBytes(length));
  }

  readBytes(length: number): Uint8Array {
    return this.chunk.subarray(this.offset, this.offset += length);
  }

  readZeroString(): string {
    const start = this.offset;
    const end = this.chunk.indexOf(0, start);
    this.offset = end + 1;
    return this.decoder.decode(this.chunk.subarray(start, end));
  }
}
