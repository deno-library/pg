import * as util from "./util.ts";
import Reader from "./reader.ts";
import Writer from "./writer.ts";
import Message from "./message.ts";
import Query from "./query.ts";

interface Config {
  user?: string;
  password: string;
  database?: string;
  hostname?: string;
  certFile?: string;
  port?: number;
}

export default class Connection {
  private conn!: Deno.Conn;
  private readonly encoding = "utf-8";
  private user: string;
  private password: string;
  private hostname: string;
  private database: string;
  private certFile: string;
  private port: number;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private activeQuery = new Query();
  private processID?: string;
  private secretKey?: string;

  constructor(config: Config) {
    this.user = config.user ?? "postgres";
    this.hostname = config.hostname ?? "127.0.0.1";
    this.database = config.database ?? "postgres";
    this.port = config.port ?? 5432;
    this.certFile = config.certFile ?? "";
    this.password = config.password;
  }

  async connect(): Promise<void> {
    try {
      const { port, hostname } = this;
      this.conn = await Deno.connect({ port, hostname });
      if (this.certFile) await this.requestSsl();
      await this.startup();
    } catch (error) {
      if (error.name === "ECONNRESET" || error.name === "EPIPE") return;
      throw error;
    }
  }

  async startup(): Promise<void> {
    const body = {
      user: this.user,
      database: this.database,
      client_encoding: "'utf-8'",
    };
    const size = Writer.getSize(8, body);
    const writer = new Writer(size);
    writer.writeInt32(size).writeInt16(3).writeInt16(0).writeBody(body);
    await Deno.writeAll(this.conn, writer.buffer);
    await this.readMessage();
  }

  private async readMessage(): Promise<void> {
    const buffer = await util.readMsg(this.conn);
    const reader = new Reader(buffer!);
    let chunk: Uint8Array | null;
    while (chunk = reader.read()) {
      if (chunk === null || chunk.length === 0) break;
      const message = new Message({
        chunk,
        length: reader.length,
        header: reader.header,
      });
      if (message.name === "error") {
        throw new Error(message.message);
      }
      await this.handleMessage(message);
    }
  }

  async handleMessage(message: Message): Promise<void> {
    switch (message.name) {
      case "AuthenticationMD5Password":
        const md5Password = util.Md5Password(
          this.user,
          this.password,
          message.salt,
        );
        await this.auth(md5Password);
        break;
      case "AuthenticationCleartextPassword":
        await this.auth(this.password);
        break;
      case "BackendKeyData":
        this.processID = message.processID;
        this.secretKey = message.secretKey;
        break;
      case "AuthenticationOk":
      case "ParameterStatus":
        break;
      case "ReadyForQuery":
        return;
      case "RowDescription":
        await this.activeQuery.handleRowDescription(message);
        break;
      case "DataRow":
        await this.activeQuery.handleDataRow(message);
        break;
      case "CommandComplete":
        await this.activeQuery.handleCommandComplete(message);
        return;
      default:
        console.debug(message);
        throw new Error("Unknown response");
    }
  }

  async auth(password: string): Promise<void> {
    const encodedPassword = this.encoder.encode(password);
    const passwordLen = encodedPassword.byteLength;
    const size = 1 + 4 + passwordLen + 1; // Byte1('p') + Int32 + String + 1(null terminator)
    const writer = new Writer(size);
    writer.writeHeader("p").writeInt32(size - 1).write(encodedPassword);
    await Deno.writeAll(this.conn, writer.buffer);
    await this.readMessage();
  }

  async query(sql: string): Promise<Query> {
    const encodedSql = this.encoder.encode(sql);
    const sqlLen = encodedSql.byteLength;
    const size = 1 + 4 + sqlLen + 1; // Byte1('Q') + Int32 + String + 1(null terminator)
    const writer = new Writer(size);
    writer.writeHeader("Q").writeInt32(size - 1).write(encodedSql);
    await Deno.writeAll(this.conn, writer.buffer);
    await this.readMessage();
    return this.activeQuery;
  }

  async end(): Promise<void> {
    const writer = new Writer(5);
    writer.writeHeader("X").writeInt32(4);
    await this.conn.write(writer.buffer);
    this.conn.close();
  }

  async requestSsl(): Promise<void> {
    // warn: no null terminator
    const size = 8;
    const writer = new Writer(size);
    writer.writeInt32(size).writeInt16(1234).writeInt16(5679);
    await Deno.writeAll(this.conn, writer.buffer);
    const buffer = await util.readMsg(this.conn);
    const responseCode = this.decoder.decode(buffer!);
    switch (responseCode) {
      case "S": // Server supports SSL connections, continue with a secure connection
        break;
      case "N": // Server does not support SSL connections
        this.end();
        throw new Error("Server does not support SSL connections");
      default: // Any other response byte, including 'E' (ErrorResponse) indicating a server error
        this.end();
        throw new Error("There was an error establishing an SSL connection");
    }
    const { port, hostname, certFile } = this;
    this.conn = await Deno.connectTls({
      port,
      hostname,
      certFile,
    });
  }
}
