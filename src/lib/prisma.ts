import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { 
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const getPrismaInstance = () => {
  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith('postgres:') || dbUrl.startsWith('postgresql:');

  if (isPostgres) {
    if (!globalForPrisma.pgPool) {
      globalForPrisma.pgPool = new Pool({ connectionString: dbUrl });
    }
    const adapter = new PrismaPg(globalForPrisma.pgPool);
    return new PrismaClient({ adapter });
  } else {
    const url = dbUrl || "file:./prisma/dev.db";
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
  }
};

export const prisma = globalForPrisma.prisma || getPrismaInstance();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
