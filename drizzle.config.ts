import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // "session" is managed by connect-pg-simple (express-session storage),
  // not part of our Drizzle schema -- exclude it so db:push stops proposing
  // to drop it.
  tablesFilter: ["!session"],
});
