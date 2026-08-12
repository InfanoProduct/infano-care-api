import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding more modules and chapters into existing courses...");

  // Get existing courses
  const course1 = await prisma.lmsCourse.findFirst({
    where: { title: "Introduction to Mindful Parenting" }
  });

  if (course1) {
    console.log(`Adding modules to ${course1.title}`);
    
    // Add Module 2
    await prisma.lmsModule.create({
      data: {
        courseId: course1.id,
        title: "Module 2: Communication Strategies",
        description: "Learn how to talk so your teens will listen.",
        order: 2,
        chapters: {
          create: [
            {
              title: "Active Listening",
              type: "VIDEO",
              order: 1,
              video: {
                create: {
                  videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4",
                  duration: 450
                }
              }
            },
            {
              title: "Handling Conflict",
              type: "VIDEO",
              order: 2,
              video: {
                create: {
                  videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4",
                  duration: 600
                }
              }
            },
            {
              title: "Module 2 Quiz",
              type: "ASSESSMENT",
              order: 3,
              assessment: {
                create: {
                  passingScore: 80,
                  questions: [
                    { question: "What is the best way to handle an argument?", options: ["Walk away", "Listen and validate", "Yell louder"], correctAnswerIndex: 1 }
                  ]
                }
              }
            }
          ]
        }
      }
    });
    
    // Add Module 3
    await prisma.lmsModule.create({
      data: {
        courseId: course1.id,
        title: "Module 3: Setting Boundaries",
        description: "How to set healthy limits without alienating your teen.",
        order: 3,
        chapters: {
          create: [
            {
              title: "Why Boundaries Matter",
              type: "VIDEO",
              order: 1,
              video: {
                create: {
                  videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4",
                  duration: 350
                }
              }
            },
            {
              title: "Enforcing Consequences",
              type: "VIDEO",
              order: 2,
              video: {
                create: {
                  videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4",
                  duration: 480
                }
              }
            }
          ]
        }
      }
    });
  }

  const course2 = await prisma.lmsCourse.findFirst({
    where: { title: "Advanced Teenage Psychology" }
  });

  if (course2) {
    console.log(`Adding modules to ${course2.title}`);
    
    // Add Module 2
    await prisma.lmsModule.create({
      data: {
        courseId: course2.id,
        title: "Module 2: Emotional Regulation",
        description: "Understanding emotional swings during puberty.",
        order: 2,
        chapters: {
          create: [
            {
              title: "The Hormonal Rollercoaster",
              type: "VIDEO",
              order: 1,
              video: {
                create: {
                  videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_5mb.mp4",
                  duration: 800
                }
              }
            },
            {
              title: "Coping Mechanisms",
              type: "VIDEO",
              order: 2,
              video: {
                create: {
                  videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4",
                  duration: 420
                }
              }
            }
          ]
        }
      }
    });
  }

  console.log("Successfully seeded additional modules and chapters.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
