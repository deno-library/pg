import { Client, ClientConfig } from "./client.ts";
import Query from "./query.ts";

interface PoolConfig extends ClientConfig {
  max: number;
  waitForConnections: boolean;
  queueLimit: number;
  idleTimeoutMillis: number;
  waitForConnectionsMillis: number;
}

interface ClientOfPool extends Client {
  timeoutId: number;
  release: Function;
}

interface Queue extends Function {
  timeoutId: number;
}

export class Pool {
  private idle: ClientOfPool[] = [];
  private clients: ClientOfPool[] = [];
  private queue: Function[] = [];
  private ended = false;

  readonly clientConfig: ClientConfig;
  readonly max: number;
  readonly waitForConnections: boolean;
  readonly queueLimit: number;
  readonly idleTimeoutMillis: number;
  readonly waitForConnectionsMillis: number;

  constructor(options: PoolConfig) {
    this.max = options.max ?? 10;
    this.waitForConnections = options.waitForConnections ?? true;
    this.queueLimit = options.queueLimit ?? 0;
    this.idleTimeoutMillis = options.idleTimeoutMillis ?? 10000;
    this.waitForConnectionsMillis = options.waitForConnectionsMillis ?? 0;
    this.clientConfig = {
      user: options.user,
      hostname: options.hostname,
      database: options.database,
      password: options.password,
      port: options.port,
      certFile: options.certFile,
    };
  }

  async connect(): Promise<ClientOfPool> {
    if (this.ended) {
      throw new Error("Cannot use a pool after calling end on the pool");
    }
    if (this.idle.length > 0) {
      const client = this.idle.pop() as ClientOfPool;
      if (client.timeoutId) clearTimeout(client.timeoutId);
      return client;
    }
    if (this.clients.length >= this.max) {
      if (!this.waitForConnections) {
        throw new Error("No connections available.");
      }
      if (this.queueLimit && this.queue.length >= this.queueLimit) {
        throw new Error("Queue limit reached.");
      }

      return new Promise((resolve, reject) => {
        const queue = (client: ClientOfPool) => resolve(client);
        this.queue.push(queue);
        if (this.waitForConnectionsMillis) {
          (queue as any).timeoutId = setTimeout(() => {
            this.queue = this.queue.filter((c) => c !== queue);
            const err = new Error("wait for connection timeout");
            reject(err);
          }, this.waitForConnectionsMillis);
        }
      });
    }
    const client = new Client(this.clientConfig) as ClientOfPool;
    await client.connect();

    client.release = () => {
      if (this.queue.length > 0) {
        const queue = this.queue.shift();
        return queue!(client);
      } else {
        if (this.idleTimeoutMillis) {
          client.timeoutId = setTimeout(() => {
            this.removeClient(client);
            client.end();
          }, this.idleTimeoutMillis);
        }
        this.idle.push(client);
      }
    };

    this.clients.push(client);
    return client;
  }

  private removeClient(client: ClientOfPool) {
    this.idle = this.idle.filter((c) => c !== client);
    this.clients = this.clients.filter((c) => c !== client);
  }

  async query(sql: string): Promise<Query> {
    const client = await this.connect();
    const result = await client.query(sql);
    client.release();
    return result;
  }

  async end(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    await Promise.all(this.clients.map((client) => client.end()));
    this.idle.length = 0;
    this.clients.length = 0;
    this.queue.length = 0;
  }
}
