import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std/testing/asserts.ts";
import { Client, Pool } from "../mod.ts";

const { test } = Deno;

test("client ssl should ok", async () => {
  const client = new Client({
    password: "esri@123",
    certFile: "./certs/my_custom_root_CA.pem",
  });

  await client.connect();

  try {
    const res = await client.query("SELECT * from users");
    assert(res);
    assert(res.command === "SELECT");
    assert(typeof res.rowCount === "number");
    assert(Array.isArray(res.rows));
    assert(Array.isArray(res.fields));
  } catch (error) {
    console.log(error);
    assert(false);
  } finally {
    await client.end();
  }
});

test("pool ssl should ok", async () => {
  const pool = new Pool({
    password: "esri@123",
    certFile: "./certs/my_custom_root_CA.pem",
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
