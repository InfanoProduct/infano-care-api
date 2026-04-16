import { prisma } from "../src/db/client.js";

async function run() {
  const ids = [
    "c1b2ff75-3045-48b7-ad34-31ee6fb8467f",
    "acc67d19-b352-44e1-819e-751c676f111b"
  ];

  console.log(`Deleting cycle records: ${ids.join(", ")}`);

  const result = await prisma.cycleRecord.deleteMany({
    where: {
      id: { in: ids }
    }
  });

  console.log(`Deleted ${result.count} records.`);
}

run()
  .catch(console.error)
  .finally(() => process.exit());
