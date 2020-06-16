import { Pool } from "../mod.ts";
import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std/testing/asserts.ts";

const decoder = new TextDecoder();
const { test } = Deno;

const pool = new Pool({
  password: "esri@123",
});

test("transaction should ok", async () => {
  // prepare data
  const { rowCount, rows } = await pool.query(
    `INSERT INTO users(id, name) VALUES(1, 'zfx') RETURNING id`,
  );
  assert(rowCount === 1);
  assert(rows.length === 1);
  assert(rows[0].id === 1);

  const client = await pool.connect();

  try {
    // rollback
    await client.query("BEGIN");
    const del = await client.query("DELETE FROM users WHERE id=1");
    assert(del.command === "DELETE");
    assert(del.rowCount === 1);
    const { rows } = await client.query("SELECT * FROM users");
    assert(rows.length === 0);
    await client.query("ROLLBACK");
    const res = await client.query("SELECT * FROM users");
    assert(res.rows.length === 1);
    assert(res.rows[0].id === 1);
    assert(res.rows[0].name === "zfx");

    // commit
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO users(id, name) VALUES(2, 'zfx2') RETURNING id`,
      );
      assert(rows.length === 1);
      assert(rows[0].id === 2);
      await client.query("COMMIT");
      const res = await client.query("SELECT * FROM users");
      assert(res.rows.length === 2);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } catch (error) {
    console.debug(error);
    assert(false);
  } finally {
    // clean
    client.release();
    const res = await pool.query("DELETE FROM users WHERE id in(1, 2)");
    assert(res.rowCount === 2);
    await pool.end();
  }
});
