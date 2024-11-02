import { PrismaClient } from "@prisma/client";

declare global{
  namespace globalThis {
    let prisma: PrismaClient | undefined;
  }
}
