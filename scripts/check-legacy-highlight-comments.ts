import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
  // Raw query since the `comment`/`suggested_text` columns are being
  // dropped from the highlights table by the new schema -- check what's
  // there (if anything) before that migration runs.
  const result = await db.execute(
    sql`SELECT id, comment, suggested_text FROM highlights WHERE comment IS NOT NULL`
  );
  const rows = result.rows as any[];

  if (rows.length === 0) {
    console.log("No existing highlight comments -- safe to drop those columns.");
  } else {
    console.log(`Found ${rows.length} highlight(s) with data that will be lost:`);
    for (const row of rows) {
      console.log(`- highlight ${row.id}: comment="${row.comment}" suggestedText=${row.suggested_text ? `"${row.suggested_text}"` : "null"}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  });
