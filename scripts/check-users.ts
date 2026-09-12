import { db } from "../db";
import { users } from "../db/schema";

async function main() {
  const allUsers = await db.select({ id: users.id, username: users.username, email: users.email }).from(users);
  console.log(`Total users: ${allUsers.length}`);
  for (const u of allUsers) {
    console.log(`- id ${u.id}: username="${u.username}" email="${u.email}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  });
