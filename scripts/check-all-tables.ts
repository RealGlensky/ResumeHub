import { db } from "../db";
import { users, resumes, comments, jobOffers, networkInvitations, networkConnections, notifications, highlights, passwordResetTokens } from "../db/schema";
import { sql } from "drizzle-orm";

async function count(name: string, table: any) {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(table);
  console.log(`${name}: ${row.count}`);
}

async function main() {
  await count("users", users);
  await count("resumes", resumes);
  await count("comments", comments);
  await count("jobOffers", jobOffers);
  await count("networkInvitations", networkInvitations);
  await count("networkConnections", networkConnections);
  await count("notifications", notifications);
  await count("highlights", highlights);
  await count("passwordResetTokens", passwordResetTokens);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  });
