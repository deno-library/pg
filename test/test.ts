import { Client, Pool } from "../mod.ts";

const client = new Client({
  password: "esri@123",
});

try {
  await client.connect();
  const result = await client.query("select * from test");
  console.log(result);
  console.log(result.rows);
} catch (error) {
  console.log(error);
} finally {
  await client.end();
}
