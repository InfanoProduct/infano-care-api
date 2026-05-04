import dotenv from 'dotenv';
import { uploadToSftp } from './src/modules/blog/sftp.js';
import fs from 'fs';

// Load env vars
dotenv.config({ path: '.env.local' });

async function testSftp() {
  console.log('Testing SFTP upload...');
  console.log('Using HOST:', process.env.SSH_HOST);
  console.log('Using USER:', process.env.SSH_USER);
  console.log('Using PATH:', process.env.SSH_UPLOAD_PATH);

  try {
    const buffer = Buffer.from('test image content');
    const filename = await uploadToSftp(buffer, 'test-image.txt');
    console.log('SUCCESS! Filename:', filename);
    console.log('Public URL should be:', (process.env.IMAGE_BASE_URL || 'http://localhost:4005/uploads/blog') + '/' + filename);
  } catch (error) {
    console.error('SFTP test failed:', error);
  }
}

testSftp();
