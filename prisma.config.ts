/**
 * Prisma 7 configuration for Neon serverless PostgreSQL.
 *
 * In Prisma 7, connection URLs are configured here (not in schema.prisma).
 * - DATABASE_URL: Pooled connection for Prisma Client (has -pooler in hostname)
 * - DIRECT_URL: Direct connection for Prisma CLI migrations (no pooler)
 */

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    directUrl: process.env["DIRECT_URL"],
  },
});
