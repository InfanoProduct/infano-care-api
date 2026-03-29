import '../src/config/env.js'; 
import { redis } from '../src/db/redis.js';
import { logger } from '../src/config/logger.js';

async function test() {
  console.log("Initial status:", redis.status);
  
  try {
    console.log("Setting key 'test_key'...");
    await redis.setex('test_key', 10, 'fallback_works');
    const val = await redis.get('test_key');
    console.log("Value retrieved:", val);
    
    if (val === 'fallback_works') {
      console.log("SUCCESS: Redis fallback mechanism is working.");
    } else {
      console.log("FAILURE: Retrieved value does not match.");
    }
  } catch (error: any) {
    console.error("ERROR during test:", error.message);
  }
}

test();
