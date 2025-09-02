import { defineConfig } from "drizzle-kit";

// Use external PostgreSQL server if DATABASE_URL is not set
const DATABASE_URL = process.env.DATABASE_URL || "postgres://roberto:Sf544344$wedf@95.111.233.250:5432/timesheet?sslmode=disable";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
