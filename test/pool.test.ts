import { Pool } from "../mod.ts";

const pool = new Pool({
  password: "esri@123",
});

try {
  const result = await pool.query("select * from test");
  console.log(result);
} catch (error) {
  console.log(error);
} finally {
  await pool.end();
}
