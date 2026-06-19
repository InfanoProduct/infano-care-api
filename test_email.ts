import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Or .env depending on the setup

import { sendGigiBookOrderPlacedEmail } from './src/common/services/email.service';

const testMailjet = async () => {
  try {
    console.log('Sending test template email via Mailjet SMTP...');
    await sendGigiBookOrderPlacedEmail(
      'umesh.tandon.51@gmail.com', // Replace with your email to test
      {
        parent_name: 'Umesh',
        quantity: 1,
        order_id: 'INF-20260619',
        amount: 1499,
        estimated_delivery: '5-7 business days',
        track_order_url: 'https://infano.care/track'
      }
    );
    console.log('Test completed successfully.');
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testMailjet();
