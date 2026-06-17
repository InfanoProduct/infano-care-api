import { prisma } from "../src/db/client.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function verify() {
  try {
    console.log("Querying prisma.program.findMany()...");
    const programs = await prisma.program.findMany({
      orderBy: { minClass: "asc" }
    });
    console.log("Successfully retrieved programs from database!");
    console.log("Programs found:", programs.map(p => ({ id: p.id, title: p.title, consultations: p.consultations })));
  } catch (error) {
    console.error("Verification failed! Prisma query returned an error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
