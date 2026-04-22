import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;

// Neon serverless HTTP driver is required for deployed (autoscale) environments.
// Standard pg TCP connections fail against suspended Neon endpoints.
// Local Replit development databases use the internal 'helium' host.
const isNeon = databaseUrl.includes("neon.tech");

export const pool = isNeon ? null : new Pool({ connectionString: databaseUrl });

export const db = isNeon
  ? drizzleNeon(neon(databaseUrl), { schema })
  : drizzlePg(pool!, { schema });

export * from "./schema";
