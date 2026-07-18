import { prisma } from "../src/db/client.js";

async function main() {
  console.log("Fetching all webinars from database...");
  try {
    const webinars = await prisma.webinar.findMany();
    console.log(`Found ${webinars.length} webinars.`);
    webinars.forEach((w) => {
      console.log(`ID: "${w.id}", Slug: "${w.slug}", Title: "${w.title}", isActive: ${w.isActive}, Date: ${w.date}`);
    });
  } catch (error) {
    console.error("Error querying webinars:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
