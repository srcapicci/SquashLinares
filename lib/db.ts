import { Pool } from "pg";
const globals = globalThis as unknown as { pool?: Pool };
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return (globals.pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  }));
}
