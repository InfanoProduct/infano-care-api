import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 5 Learning Programs for Adolescent Girls...');

  const programsData = [
    {
      title: 'SPARK',
      tagline: 'Discovering the New Me.',
      description: 'A gentle introduction to puberty designed specifically for 5th graders. This program focuses on understanding early physical changes, maintaining daily hygiene, and building foundational self-confidence before major changes begin.',
      duration: '4 Weeks',
      price: 2500,
      isActive: true,
      thumbnailUrl: 'https://images.unsplash.com/photo-1594801129424-69931ec19e7a?auto=format&fit=crop&q=80',
      enrolledCount: 840,
      topics: [
        'Introduction to Body Changes',
        'Basic Hygiene Practices',
        'Understanding Feelings & Moods',
        'Building Early Confidence'
      ],
      features: [
        '4 Interactive Live Sessions',
        'Digital Learning Access',
        'Gigi The Awkward Age Book Included',
        'Parent Insight Dashboard'
      ],
      curriculum: [
        { week: 1, title: 'What is Puberty?', description: 'Understanding the normal, healthy changes that happen as you grow.' },
        { week: 2, title: 'My Changing Body', description: 'Early signs of physical development and why they happen.' },
        { week: 3, title: 'Healthy Habits', description: 'Basic hygiene routines and taking care of a growing body.' },
        { week: 4, title: 'All These Feelings', description: 'Navigating new emotions and learning to talk about them.' }
      ],
      consultations: [
        { title: 'Introductory Care Call', expertId: '' }
      ]
    },
    {
      title: 'RISE',
      tagline: 'Owning the Changes.',
      description: 'Built for 6th graders who are actively navigating physical changes. Focuses heavily on menstrual education, managing early periods, and understanding the science behind the bodily shifts.',
      duration: '6 Weeks',
      price: 3500,
      isActive: true,
      thumbnailUrl: 'https://images.unsplash.com/photo-1517869662892-debcba73f628?auto=format&fit=crop&q=80',
      enrolledCount: 1250,
      topics: [
        'Menstrual Health Deep Dive',
        'Tracking the Cycle',
        'Managing Period Symptoms',
        'PCOS Awareness'
      ],
      features: [
        '6 Expert Led Sessions',
        'Menstrual Cycle Tracker',
        'SOS Period Guide',
        'Parent Resource Kit'
      ],
      curriculum: [
        { week: 1, title: 'The Menstrual Cycle', description: 'The biology of periods explained simply and scientifically.' },
        { week: 2, title: 'Products & Practices', description: 'How to use and dispose of pads, tampons, and cups safely.' },
        { week: 3, title: 'Tracking My Flow', description: 'Why tracking your cycle is a superpower.' },
        { week: 4, title: 'Pain & Symptoms', description: 'Managing cramps, acne, and understanding when to see a doctor.' },
        { week: 5, title: 'PCOS & Hormones', description: 'Early awareness of hormonal health and what is considered normal.' },
        { week: 6, title: 'My Body My Rules', description: 'Body autonomy and setting physical boundaries.' }
      ],
      consultations: [
        { title: 'Menstrual Health Consultation', expertId: '' }
      ]
    },
    {
      title: 'BLOOM',
      tagline: 'Finding Emotional Balance.',
      description: 'Targeted for 7th graders experiencing intense emotional fluctuations and social dynamics. This program shifts the focus to mental well-being, body image, and peer relationships.',
      duration: '6 Weeks',
      price: 3500,
      isActive: true,
      thumbnailUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80',
      enrolledCount: 1540,
      topics: [
        'Emotional Regulation',
        'Body Positivity vs Neutrality',
        'Navigating Friendships',
        'Digital Wellness'
      ],
      features: [
        '6 Interactive Live Sessions',
        'Journaling Templates',
        'Private Peer Community Access',
        'Weekly Parent Prompts'
      ],
      curriculum: [
        { week: 1, title: 'The Rollercoaster Brain', description: 'Understanding why you feel things so intensely right now.' },
        { week: 2, title: 'Body Unfiltered', description: 'Deconstructing beauty standards and embracing body neutrality.' },
        { week: 3, title: 'Friendship Drama', description: 'Navigating cliques, rumors, and conflict resolution.' },
        { week: 4, title: 'Digital Footprints', description: 'Social media safety and avoiding comparison traps.' },
        { week: 5, title: 'Stress & Anxiety', description: 'Tools and breathing techniques to manage academic and social stress.' },
        { week: 6, title: 'Finding My Voice', description: 'Assertive communication and speaking up for yourself.' }
      ],
      consultations: [
        { title: 'Emotional Wellness Check-in', expertId: '' },
        { title: 'Follow-up Consultation', expertId: '' }
      ]
    },
    {
      title: 'IGNITE',
      tagline: 'Fueling Independence.',
      description: 'Designed for 8th graders to foster independence, critical thinking, and advanced self-care. Focuses on nutrition, fitness, sleep hygiene, and long-term holistic wellness.',
      duration: '8 Weeks',
      price: 4500,
      isActive: true,
      thumbnailUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80',
      enrolledCount: 1120,
      topics: [
        'Nutrition for Growth',
        'Sleep Hygiene',
        'Fitness & Sports',
        'Advanced Anatomy'
      ],
      features: [
        '8 Expert Led Sessions',
        'Diet & Nutrition Guides',
        'Sleep Tracking Tools',
        '1-on-1 Mentorship Availability'
      ],
      curriculum: [
        { week: 1, title: 'Fueling Up', description: 'Understanding macro and micro nutrients your growing body needs.' },
        { week: 2, title: 'The Power of Sleep', description: 'Why circadian rhythms matter and how to fix your sleep schedule.' },
        { week: 3, title: 'Moving Right', description: 'Incorporating fitness, stretching, and managing sports injuries.' },
        { week: 4, title: 'Skin & Hair Science', description: 'Dermatological care for acne and hormonal skin changes.' },
        { week: 5, title: 'Advanced Anatomy', description: 'Deep dive into reproductive health and biology.' },
        { week: 6, title: 'Mental Resilience', description: 'Bouncing back from failure and developing a growth mindset.' },
        { week: 7, title: 'Time Management', description: 'Balancing school, hobbies, friends, and rest.' },
        { week: 8, title: 'Holistic Health Plan', description: 'Creating a personalized self-care routine.' }
      ],
      consultations: [
        { title: 'Nutrition & Diet Consultation', expertId: '' },
        { title: 'Dermatology Q&A', expertId: '' }
      ]
    },
    {
      title: 'UNSTOPPABLE',
      tagline: 'Stepping into Womanhood.',
      description: 'The culminating program for 9th graders. This covers advanced interpersonal skills, future readiness, comprehensive sexual health awareness, and solidifying lifelong habits.',
      duration: '8 Weeks',
      price: 5000,
      isActive: true,
      thumbnailUrl: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&q=80',
      enrolledCount: 950,
      topics: [
        'Sexual Health Awareness',
        'Consent & Boundaries',
        'Future Readiness',
        'Lifelong Wellness Habits'
      ],
      features: [
        '8 Interactive Live Sessions',
        'Comprehensive Health Playbook',
        'Alumni Network Access',
        'Career & Growth Mentorship'
      ],
      curriculum: [
        { week: 1, title: 'Beyond Puberty', description: 'What to expect in late adolescence and transitioning into young adulthood.' },
        { week: 2, title: 'Consent is Everything', description: 'Understanding affirmative consent and bodily autonomy in all contexts.' },
        { week: 3, title: 'Sexual Health Fact Check', description: 'Debunking myths and learning facts about reproductive and sexual health.' },
        { week: 4, title: 'Romantic Relationships', description: 'Navigating crushes, dating safely, and identifying red flags.' },
        { week: 5, title: 'Financial Confidence', description: 'Basics of money management, savings, and financial independence.' },
        { week: 6, title: 'Career Dreams', description: 'Goal setting, discovering passions, and overcoming imposter syndrome.' },
        { week: 7, title: 'Global Citizenship', description: 'Understanding your place in the world and making an impact.' },
        { week: 8, title: 'The Unstoppable You', description: 'Graduation session: Reviewing the journey and setting intentions.' }
      ],
      consultations: [
        { title: 'Comprehensive Health Review', expertId: '' },
        { title: 'Future Readiness Mentorship', expertId: '' }
      ]
    }
  ];

  for (const prog of programsData) {
    const created = await prisma.program.upsert({
      where: { title: prog.title },
      update: {
        tagline: prog.tagline,
        description: prog.description,
        duration: prog.duration,
        price: prog.price,
        topics: prog.topics,
        curriculum: prog.curriculum,
        consultations: prog.consultations,
        features: prog.features,
      },
      create: prog,
    });
    console.log(`Seeded program: ${created.title}`);
  }

  // Optionally delete the old generic program if it exists
  try {
    await prisma.program.delete({
      where: { title: 'Blooming Into You: A Journey of Self-Discovery' }
    });
    console.log('Cleaned up old generic program.');
  } catch (e) {
    // It might not exist, ignore
  }

  console.log('All programs seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
