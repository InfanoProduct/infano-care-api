import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

async function testUpload() {
  const formData = new FormData();
  // Create a small dummy text file (multer filter allows images but let's try a jpg extension)
  const dummyFile = 'dummy.jpg';
  fs.writeFileSync(dummyFile, 'dummy content');
  
  formData.append('file', fs.createReadStream(dummyFile));
  
  try {
    const response = await axios.post('http://localhost:4005/api/blog/upload-image?folder=test-folder', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    console.log('Upload Success:', response.data);
  } catch (error: any) {
    console.error('Upload Failed:', error.response?.data || error.message);
  } finally {
    if (fs.existsSync(dummyFile)) fs.unlinkSync(dummyFile);
  }
}

testUpload();
