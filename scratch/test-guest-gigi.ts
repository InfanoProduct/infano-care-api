import dotenv from 'dotenv';
import { ChatService } from '../src/modules/chat/chat.service.js';

dotenv.config(); // Load environment variables from .env

const chatService = new ChatService();

async function testQuery(content: string, platform: 'web' | 'mobile') {
  console.log(`\n--- Query (${platform}): "${content}" ---`);
  try {
    const result = await chatService.processMessage(
      undefined, // guest (no userId)
      content,
      'test-session',
      undefined,
      [],
      platform
    );
    console.log(`Gigi's Response:\n${result.message.content}`);
  } catch (error) {
    console.error('Error during chat query execution:', error);
  }
}

async function main() {
  // Test 1: Info about website and app features
  await testQuery('What features are available on the website and the mobile app?', 'web');

  // Test 2: Period tracking (mobile-only feature)
  await testQuery('How do I track my period cycle?', 'web');

  // Test 3: Logged in requirement (should require login)
  await testQuery('Can you show my daughter progress or check cycle status?', 'web');
}

main().catch(console.error);
