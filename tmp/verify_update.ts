import { prisma } from "../src/db/client.js";
import { TrackerService } from "../src/modules/tracker/tracker.service.ts";

async function run() {
  const testUserId = "test-user-selective-edit";
  
  // 1. Cleanup
  await prisma.cycleRecord.deleteMany({ where: { userId: testUserId } });
  
  console.log("Creating initial record for April 10...");
  await TrackerService.updatePeriodRange(testUserId, "2024-04-10", "2024-04-15");
  
  const recordsAfter1 = await prisma.cycleRecord.findMany({ where: { userId: testUserId } });
  console.log(`Records after step 1: ${recordsAfter1.length}`);
  console.log(`Start Date: ${recordsAfter1[0].startDate.toISOString()}`);

  console.log("\nShifting record to April 11...");
  await TrackerService.updatePeriodRange(testUserId, "2024-04-11", "2024-04-16");
  
  const recordsAfter2 = await prisma.cycleRecord.findMany({ where: { userId: testUserId } });
  console.log(`Records after step 2: ${recordsAfter2.length}`);
  
  if (recordsAfter2.length === 1) {
    console.log("SUCCESS: Only one record exists.");
    console.log(`New Start Date: ${recordsAfter2[0].startDate.toISOString()}`);
  } else {
    console.log("FAILURE: Multiple records found.");
  }
}

run().catch(console.error).finally(() => process.exit());
