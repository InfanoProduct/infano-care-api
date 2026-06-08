import { prisma } from "../src/db/client.js";
import { ChatService } from "../src/modules/chat/chat.service.js";

async function main() {
  const parentId = "36a04b31-60ff-4e99-96e9-00a177e112b5"; // +916306890199
  console.log("Testing Gigi Chat for Parent with enrolled program:", parentId);
  const chatService = new ChatService();

  console.log("\n--- Parent query: 'what is my program progress?' ---");
  const res = await chatService.processMessage(parentId, "what is my program progress?");
  console.log("Gigi Response:\n", res.message.content);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
