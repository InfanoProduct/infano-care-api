import fs from 'fs';
import path from 'path';

async function testUpload() {
  const dummyFile = 'dummy.jpg';
  fs.writeFileSync(dummyFile, 'dummy content');
  
  const formData = new FormData();
  const blob = new Blob([fs.readFileSync(dummyFile)], { type: 'image/jpeg' });
  formData.append('file', blob, dummyFile);
  
  try {
    const response = await fetch('http://localhost:4005/api/blog/upload-image?folder=test-folder', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    console.log('Upload Result:', data);
  } catch (error: any) {
    console.error('Upload Failed:', error.message);
  } finally {
    if (fs.existsSync(dummyFile)) fs.unlinkSync(dummyFile);
  }
}

testUpload();
