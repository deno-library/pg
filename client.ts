import Connection from "./connection.ts";
import Query from "./query.ts";

export interface ClientConfig {
  user?: string;
  password: string;
  database?: string;
  hostname?: string;
  certFile?: string;
  port?: number;
}

export class Client {
  private conn: Connection;
  private connecting = false;
  private connected = false;
  private queryable = true;
  private ended = false;

  constructor(config: ClientConfig) {
    this.conn = new Connection(config);
  }

  async connect() {
    if (this.connecting || this.connected) {
      throw new Error(
        "Client has already been connected. You cannot reuse a client.",
      );
    }
    this.connecting = true;
    await this.conn.connect();
    this.connecting = false;
    this.connected = true;
  }

  async query(sql: string): Promise<Query> {
    if (!this.queryable) throw new Error("Client is not queryable");
    if (this.ended) throw new Error("Client was closed and is not queryable");
    this.queryable = false;
    const result = await this.conn.query(sql);
    this.queryable = true;
    return result;
  }

  async end() {
    if (this.ended) return;
    this.ended = true;
    await this.conn.end();
  }
}
