import { db } from "../db";
import { users } from "../db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const dupes = await db
    .select({ email: users.email, count: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.email)
    .having(sql`count(*) > 1`);

  if (dupes.length === 0) {
    console.log("No duplicate emails -- safe to add the unique constraint.");
  } else {
    console.log(`Found ${dupes.length} duplicated email(s):`);
    for (const d of dupes) {
      console.log(`- "${d.email}" appears ${d.count} times`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  });
