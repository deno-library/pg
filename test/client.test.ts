import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std/testing/asserts.ts";
import { Client } from "../mod.ts";

const { test } = Deno;

test("client should ok", async () => {
  const client = new Client({
    password: "esri@123",
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
