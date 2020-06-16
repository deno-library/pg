import { Client } from "../mod.ts";

const client = new Client({
  password: "esri@123",
});

try {
  await client.connect();
  const result = await client.query("select * from test");
  console.log(result);
} catch (error) {
  console.log(error);
} finally {
  await client.end();
}
