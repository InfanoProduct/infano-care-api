import { prisma } from "../src/db/client.js";
import { ChatService } from "../src/modules/chat/chat.service.js";

async function main() {
  console.log("--- DB Parent Links (LINKED) ---");
  const links = await prisma.parentLink.findMany({
    where: { status: "LINKED" },
    include: {
      parent: { select: { id: true, phone: true, role: true } },
      teen: { select: { id: true, phone: true, role: true } }
    }
  });

  const testParent = links[0]?.parent || await prisma.user.findFirst({ where: { role: "PARENT" } });
  if (!testParent) {
    console.log("No parent found in DB to test!");
    return;
  }

  console.log(`\nTesting Gigi Chat for Parent: ${testParent.phone} (ID: ${testParent.id})`);
  const chatService = new ChatService();
  const sessionId = `test-session-${Date.now()}`;

  // Turn 1: Initial parent request
  console.log("\n--- Turn 1: 'How is my daughter doing?' ---");
  const res1 = await chatService.processMessage(testParent.id, "How is my daughter doing?", sessionId);
  console.log("Gigi Response:\n", res1.message.content);

  // Turn 2: Simulate parent selecting a phone number
  const teenPhone = links[0]?.teen?.phone || "+919742802062";
  console.log(`\n--- Turn 2: Select phone number: '${teenPhone}' ---`);
  const res2 = await chatService.processMessage(testParent.id, teenPhone, sessionId);
  console.log("Gigi Response:\n", res2.message.content);

  // Turn 3: Simulate parent selecting a specific pillar
  const pillarQuery = `Learning Journey for ${teenPhone}`;
  console.log(`\n--- Turn 3: Select progress option: '${pillarQuery}' ---`);
  const res3 = await chatService.processMessage(testParent.id, pillarQuery, sessionId);
  console.log("Gigi Response:\n", res3.message.content);

  // Turn 4: User asks about own progress
  console.log("\n--- Turn 4: 'what is my progress?' ---");
  const res4 = await chatService.processMessage(testParent.id, "what is my progress?", sessionId);
  console.log("Gigi Response:\n", res4.message.content);

  // Turn 5: User selects specific pillar for own progress
  console.log("\n--- Turn 5: Select progress option: 'Learning Journey' ---");
  const res5 = await chatService.processMessage(testParent.id, "Learning Journey", sessionId);
  console.log("Gigi Response:\n", res5.message.content);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
