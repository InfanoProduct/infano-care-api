import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkContent() {
  try {
    const episode = await prisma.episode.findUnique({
      where: { id: '7339cc3c-62b3-4226-85f5-f988aaed1607' }
    });

    if (!episode) {
      console.log('Episode not found');
      return;
    }

    const content = episode.content as any;
    const questions = content.knowledgeCheck?.questions || [];
    
    console.log(`Found ${questions.length} questions.`);
    questions.forEach((q: any, i: number) => {
      console.log(`Q${i+1}: ${q.question}`);
      console.log(`Feedbacks: ${q.optionFeedbacks?.length || 0}`);
      if (q.optionFeedbacks) {
        console.log(`Sample feedback: ${q.optionFeedbacks[0]}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkContent();
