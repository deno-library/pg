# deno-pg
PostgreSQL client for Deno

### Status
* [x] client
* [x] pool
* [ ] ssl
* [x] transactions

## Useage  

### Client 
```ts
import { Client, Pool } from "https://deno.land/x/pg@v0.5.0/mod.ts";

const client = new Client({
  user: 'postgres',
  hostname: '127.0.0.1',
  database: 'test',
  password: '123456',
  port: 5432
});

await client.connect();

const res = await client.query('SELECT * from users');
console.log(res);
await client.end();
```  

### ssl 
```js
import { Client, Pool } from "https://deno.land/x/pg@v0.5.0/mod.ts";

const client = new Client({
  user: 'postgres',
  hostname: 'localhost',
  database: 'test',
  password: '123456',
  port: 5432,
  certFile: "./certs/my_custom_root_CA.pem"
});

await client.connect();

const res = await client.query('SELECT * from users');
console.log(res);
await client.end();
```  

### Pool
The client pool allows you to have a reusable pool of clients you can check out, use, and return. You generally want a limited number of these in your application and usually just 1. Creating an unbounded number of pools defeats the purpose of pooling at all.

#### Checkout, use, and return
```js
import {  Pool } from "https://deno.land/x/pg@v0.5.0/mod.ts";

const pool = new Pool({
  user: "postgres",
  hostname: "127.0.0.1",
  database: "test",
  password: "123456",
  port: 5432,
});

const client = await pool.connect();
try {
  const res = await client.query("SELECT * from users");
  console.log(res);
} catch (error) {
  console.log(error);
} finally {
  client.release();
}
```
You must always return the client to the pool if you successfully check it out, regardless of whether or not there was an error with the queries you ran on the client. If you don't check in the client your application will leak them and eventually your pool will be empty forever and all future requests to check out a client from the pool will wait forever.

#### Single query
If you don't need a transaction or you just need to run a single query, the pool has a convenience method to run a query on any available client in the pool. This is the preferred way to query with node-postgres if you can as it removes the risk of leaking a client.
```js
import {  Pool } from "https://deno.land/x/pg@v0.5.0/mod.ts";

const pool = new Pool({
  user: "postgres",
  hostname: "127.0.0.1",
  database: "test",
  password: "123456",
  port: 5432,
});

const res = await pool.query("SELECT * from users");
console.log(res);
```

### Transation
To execute a transaction with node-postgres you simply execute BEGIN / COMMIT / ROLLBACK queries yourself through a client. Because node-postgres strives to be low level and un-opinionated, it doesn't provide any higher level abstractions specifically around transactions.

You must use the same client instance for all statements within a transaction. PostgreSQL isolates a transaction to individual clients. This means if you initialize or use transactions with the pool.query method you will have problems. Do not use transactions with the pool.query method.

```js
import {  Pool } from "https://deno.land/x/pg@v0.5.0/mod.ts";

const pool = new Pool({
  user: "postgres",
  hostname: "127.0.0.1",
  database: "test",
  password: "123456",
  port: 5432,
});

// note: we don't try/catch this because if connecting throws an exception
// we don't need to dispose of the client (it will be undefined)
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`INSERT INTO users(id, name) VALUES(1, 'zfx')`);
  await client.query(`INSERT INTO users(id, name) VALUES(2, 'zfx2')`);
  await client.query(`DELETE FROM users WHERE id=0`);
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```

### Shutdown
To shut down a pool call pool.end() on the pool. This will wait for all checked-out clients to be returned and then shut down all the clients and the pool timers.
```js
import { Pool } from "https://deno.land/x/pg@v0.5.0/mod.ts";

const pool = new Pool({
  user: "postgres",
  hostname: "127.0.0.1",
  database: "test",
  password: "123456",
  port: 5432,
});

const res = await pool.query("SELECT * from users");
console.log(res);
await pool.end();
// will throw error
await pool.query("SELECT * from users");
```
The pool will return errors when attempting to check out a client after you've called `pool.end()` on the pool.

## Test

```bash
$ deno test --allow-net --allow-read
```  