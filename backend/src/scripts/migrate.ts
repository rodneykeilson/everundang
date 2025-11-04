import { initDatabase, pool } from "../db.js";

async function main() {
  await initDatabase();
  console.log("Database schema ensured");
}

main()
  .catch((error) => {
    console.error("Migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
