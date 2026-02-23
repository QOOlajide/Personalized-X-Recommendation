/**
 * Prisma client singleton configured for Neon serverless PostgreSQL.
 *
 * Uses @prisma/adapter-neon for serverless compatibility with connection
 * pooling via Neon's built-in PgBouncer. The singleton pattern prevents
 * creating multiple PrismaClient instances in development (hot reload).
 *
 * @see https://www.prisma.io/docs/orm/overview/databases/neon
 */

import { PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Enable WebSocket connections for Neon serverless driver
// Required for environments without native WebSocket (Node.js < 21)
neonConfig.webSocketConstructor = ws;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Configure it in .env with your Neon connection string."
    );
  }

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({ adapter });
}

// Singleton pattern: reuse PrismaClient across hot reloads in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
