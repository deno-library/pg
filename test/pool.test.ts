import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std/testing/asserts.ts";
import { Pool } from "../mod.ts";

const { test } = Deno;

test("checkout client should ok", async () => {
  const pool = new Pool({
    password: "esri@123",
  });
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * from users");
    assert(res);
    assert(res.command === "SELECT");
    assert(typeof res.rowCount === "number");
    assert(Array.isArray(res.rows));
    assert(Array.isArray(res.fields));
  } catch (error) {
    assert(false);
  } finally {
    client.release();
    await pool.end();
  }
});

test("pool.query should ok", async () => {
  const pool = new Pool({
    password: "esri@123",
  });
  try {
    const res = await pool.query("SELECT * from users");
    assert(res);
    assert(res.command === "SELECT");
    assert(typeof res.rowCount === "number");
    assert(Array.isArray(res.rows));
    assert(Array.isArray(res.fields));
  } catch (error) {
    assert(false);
  } finally {
    await pool.end();
  }
});

test("pool.query should ok", async () => {
  assertThrowsAsync(
    async () => {
      const pool = new Pool({
        password: "esri@123",
      });
      await pool.end();
      await pool.query("SELECT * from users");
    },
    Error,
    "Cannot use a pool after calling end on the pool",
  );
});
