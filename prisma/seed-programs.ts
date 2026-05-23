import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Learning Programs ---');

  const programs = [
    {
      title: "SPARK",
      tagline: "She wakes up to herself.",
      description: "A beautifully structured early puberty and self-awareness program for young girls entering Class 5 and 6. SPARK guides girls through body positivity, boundaries, emotional resilience, and breaking down family-centric biological myths in a private, gentle setting.",
      classRange: "Class 5-6",
      minClass: 5,
      maxClass: 6,
      sessions: 8,
      duration: "2 Months",
      topics: [
        "Body Unfiltered",
        "Period. Full Stop.",
        "Myth Busters: Family Edition",
        "My Body My Boundary",
        "The Filter Lie",
        "Feel It to Deal It"
      ],
      pricePrivate: 6499.0,
      priceGroup: 3999.0,
      isActive: true
    },
    {
      title: "RISE",
      tagline: "She learns who she is - and who gets access.",
      description: "An interactive, empowering program for girls in Class 6 and 7. RISE focuses on building secure relationships, understanding physical and digital consent, identifying grooming behaviors, navigating permanent digital footprints, and learning healthy self-expression.",
      classRange: "Class 6-7",
      minClass: 6,
      maxClass: 7,
      sessions: 10,
      duration: "2.5 Months",
      topics: [
        "Consent Is Not Just About Sex",
        "Grooming Has a Script",
        "Your Digital Footprint Is Permanent",
        "Red Flags & Green Flags",
        "The Hormone Weather Report",
        "Who Am I When No One Is Watching"
      ],
      pricePrivate: 7999.0,
      priceGroup: 4999.0,
      isActive: true
    },
    {
      title: "BLOOM",
      tagline: "She faces the hard stuff before it faces her.",
      description: "An emotional wellbeing and mental wellness program tailored for Class 7 and 8. BLOOM equips girls to identify anxiety and depression, decode the myths of perfectionism, address academic peer pressure, and answer the complex questions no one else does.",
      classRange: "Class 7-8",
      minClass: 7,
      maxClass: 8,
      sessions: 10,
      duration: "2.5 Months",
      topics: [
        "Anxiety Is Real - Not Drama",
        "Depression Doesn't Look Like the Movies",
        "Your Reproductive System Is Not a Mystery",
        "The Perfectionism Trap",
        "Questions Nobody Answers",
        "Academic Pressure & Comparison Culture"
      ],
      pricePrivate: 9499.0,
      priceGroup: 5999.0,
      isActive: true
    },
    {
      title: "IGNITE",
      tagline: "She learns how the world works - and how to work it.",
      description: "A comprehensive independence and real-world preparation program for Class 8 and 9. IGNITE teaches girls about reproductive health, financial literacy, career choices that align with their strengths, navigating love pressure, and building their own definition of success.",
      classRange: "Class 8-9",
      minClass: 8,
      maxClass: 9,
      sessions: 12,
      duration: "3 Months",
      topics: [
        "The World Is Not Fair - Your Rights",
        "Reproductive Health: The Full Version",
        "Love Pressure & Your Pace",
        "Your Money Your Freedom",
        "Career That Fits You",
        "What Success Means to Me"
      ],
      pricePrivate: 8999.0,
      priceGroup: 5499.0,
      isActive: true
    },
    {
      title: "UNSTOPPABLE",
      tagline: "She walks into adult life prepared, not blindsided.",
      description: "Our flagship senior program for girls in Class 9 and 10 transitioning into high school and young adulthood. UNSTOPPABLE covers real talk about adult life, relationships, feminist perspectives on money, ongoing mental health maintenance, and career planning for a meaningful life.",
      classRange: "Class 9-10",
      minClass: 9,
      maxClass: 10,
      sessions: 12,
      duration: "3 Months",
      topics: [
        "Adult Life 101: What No One Teaches You",
        "Money Is a Feminist Issue",
        "Relationships: Real Talk",
        "Mental Health Maintenance",
        "Career - Building a Life Not Just a Resume",
        "Building a Life That's Your"
      ],
      pricePrivate: 10999.0,
      priceGroup: 6999.0,
      isActive: true
    }
  ];

  for (const program of programs) {
    await prisma.program.upsert({
      where: { title: program.title },
      update: program,
      create: program,
    });
    console.log(`[SEED] Upserted program: ${program.title}`);
  }

  console.log('--- Seeding Programs Completed! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
