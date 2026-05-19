import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Testing Enquiry creation with peer_connect type...');
  
  // Create a new peer connect enquiry
  const newEnquiry = await prisma.enquiry.create({
    data: {
      type: 'peer_connect',
      contactName: 'Jane Doe',
      email: 'janedoe@example.com',
      phone: '+1234567890',
      peerMentorName: 'Aisha Sharma',
      preferredDate: '2026-05-20',
      preferredTime: 'Morning (9AM - 12PM)',
      details: 'Requested connection with Peer Mentor: Aisha Sharma',
    }
  });

  console.log('Successfully created enquiry:', JSON.stringify(newEnquiry, null, 2));

  // Retrieve it back
  const retrieved = await prisma.enquiry.findUnique({
    where: { id: newEnquiry.id }
  });

  console.log('Successfully retrieved enquiry:', JSON.stringify(retrieved, null, 2));
  
  // Cleanup test entry
  await prisma.enquiry.delete({
    where: { id: newEnquiry.id }
  });
  console.log('Successfully cleaned up test entry.');
}

main()
  .catch(e => {
    console.error('Error during test:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
