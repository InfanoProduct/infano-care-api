import { compileEmailTemplate } from '../src/common/services/template.service.js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const html = await compileEmailTemplate('demo-session-booked', {
    parent_name: 'Priya Sharma',
    phone: '+91 9876543210',
    email: 'priya@example.com',
    slot_date: 'August 18, 2026',
    slot_time: '04:00 PM',
    comment: 'Looking forward to understanding the curriculum',
    subject: 'Your Demo Session at Infano Care is Confirmed! 🌟',
    preheaderText: 'Confirmation details for your upcoming interactive demo.',
    programs: [
      {
        title: 'The Unfiltered Journey',
        duration: '4 Weeks',
        thumbnailUrl: 'https://api-dev.infano.care/uploads/programs/ParentsImg1-od.png'
      }
    ]
  });

  const outputPath = path.join(process.cwd(), 'scratch', 'output_demo_email.html');
  await fs.writeFile(outputPath, html, 'utf-8');
  console.log('Successfully compiled demo email template to:', outputPath);
}

main().catch(console.error);
