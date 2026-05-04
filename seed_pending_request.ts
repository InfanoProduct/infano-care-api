import { prisma } from './src/db/client.js';

async function run() {
  const user = await prisma.user.findUnique({ where: { phone: '+919742802062' } });
  console.log('User ID:', user?.id);
  
  const mentor = await prisma.user.findFirst({
    where: { profile: { displayName: 'Maya Patel' } }
  });
  console.log('Mentor ID:', mentor?.id);
  
  if (user && mentor) {
    const session = await prisma.peerLineSession.create({
      data: {
        menteeId: user.id,
        mentorId: mentor.id,
        status: 'MATCHING',
        topicIds: ['mood'],
      }
    });
    console.log('Created pending session:', session.id);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
