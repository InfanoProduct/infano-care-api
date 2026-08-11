import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding LMS Courses...");

  // Course 1: Free Course
  const course1 = await prisma.lmsCourse.create({
    data: {
      title: "Introduction to Mindful Parenting",
      description: "Learn the basics of mindful parenting and how to connect better with your teenager.",
      timeDuration: 120,
      price: 0,
      isFree: true,
      thumbnailUrl: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=800&auto=format&fit=crop",
      isActive: true,
      modules: {
        create: [
          {
            title: "Module 1: The Basics",
            description: "Understanding the teenage brain.",
            order: 1,
            chapters: {
              create: [
                {
                  title: "Welcome & Overview",
                  type: "VIDEO",
                  order: 1,
                  video: {
                    create: {
                      videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                      duration: 300
                    }
                  }
                },
                {
                  title: "Quiz 1",
                  type: "ASSESSMENT",
                  order: 2,
                  assessment: {
                    create: {
                      passingScore: 80,
                      questions: [
                        { question: "What is mindful parenting?", options: ["Being present", "Ignoring them", "Yelling"], correctAnswerIndex: 0 }
                      ]
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });

  // Course 2: Paid Course
  const course2 = await prisma.lmsCourse.create({
    data: {
      title: "Advanced Teenage Psychology",
      description: "Deep dive into the psychological changes during adolescence.",
      timeDuration: 300,
      price: 1999,
      isFree: false,
      thumbnailUrl: "https://images.unsplash.com/photo-1494155106123-0d33bfd3eb8c?q=80&w=800&auto=format&fit=crop",
      isActive: true,
      modules: {
        create: [
          {
            title: "Module 1: Cognitive Development",
            order: 1,
            chapters: {
              create: [
                {
                  title: "Brain Development",
                  type: "VIDEO",
                  order: 1,
                  video: {
                    create: {
                      videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                      duration: 600
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log("Seeding finished.");
  console.log("Created Courses:", [course1.title, course2.title]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
