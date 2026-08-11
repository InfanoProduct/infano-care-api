import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up duplicate courses...");
  
  // 1. Remove duplicates
  const courses = await prisma.lmsCourse.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenTitles = new Set();
  let deletedCount = 0;

  for (const course of courses) {
    if (seenTitles.has(course.title)) {
      console.log(`Deleting duplicate course: ${course.title} (ID: ${course.id})`);
      await prisma.lmsCourse.delete({ where: { id: course.id } });
      deletedCount++;
    } else {
      seenTitles.add(course.title);
    }
  }

  console.log(`Deleted ${deletedCount} duplicate courses.`);

  console.log("Seeding new courses...");

  const reliableVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // Course 3
  if (!seenTitles.has("Navigating Social Media as a Teen")) {
    await prisma.lmsCourse.create({
      data: {
        title: "Navigating Social Media as a Teen",
        description: "A guide to maintaining mental health and safety while using social media platforms.",
        timeDuration: 180,
        price: 999,
        isFree: false,
        thumbnailUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop",
        isActive: true,
        modules: {
          create: [
            {
              title: "Module 1: Digital Footprint",
              description: "Understanding what you leave behind online.",
              order: 1,
              chapters: {
                create: [
                  {
                    title: "What is a Digital Footprint?",
                    type: "VIDEO",
                    order: 1,
                    video: { create: { videoUrl: reliableVideoUrl, duration: 400 } }
                  },
                  {
                    title: "Privacy Settings Mastery",
                    type: "VIDEO",
                    order: 2,
                    video: { create: { videoUrl: reliableVideoUrl, duration: 550 } }
                  }
                ]
              }
            }
          ]
        }
      }
    });
    console.log("Added course: Navigating Social Media as a Teen");
  }

  // Course 4
  if (!seenTitles.has("Nutrition for Growing Bodies")) {
    await prisma.lmsCourse.create({
      data: {
        title: "Nutrition for Growing Bodies",
        description: "Essential knowledge about nutrition, healthy eating habits, and body positivity.",
        timeDuration: 150,
        price: 0,
        isFree: true,
        thumbnailUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop",
        isActive: true,
        modules: {
          create: [
            {
              title: "Module 1: Balanced Diet",
              description: "The foundations of a healthy diet.",
              order: 1,
              chapters: {
                create: [
                  {
                    title: "Macronutrients Explained",
                    type: "VIDEO",
                    order: 1,
                    video: { create: { videoUrl: reliableVideoUrl, duration: 480 } }
                  },
                  {
                    title: "Diet Quiz",
                    type: "ASSESSMENT",
                    order: 2,
                    assessment: {
                      create: {
                        passingScore: 75,
                        questions: [
                          { question: "Which of these is a macronutrient?", options: ["Vitamin C", "Protein", "Iron"], correctAnswerIndex: 1 }
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
    console.log("Added course: Nutrition for Growing Bodies");
  }

  // Course 5
  if (!seenTitles.has("Study Hacks & Time Management")) {
    await prisma.lmsCourse.create({
      data: {
        title: "Study Hacks & Time Management",
        description: "Learn how to study smarter, not harder, and manage your time effectively.",
        timeDuration: 240,
        price: 1499,
        isFree: false,
        thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop",
        isActive: true,
        modules: {
          create: [
            {
              title: "Module 1: The Pomodoro Technique",
              description: "Mastering focus and taking effective breaks.",
              order: 1,
              chapters: {
                create: [
                  {
                    title: "Introduction to Pomodoro",
                    type: "VIDEO",
                    order: 1,
                    video: { create: { videoUrl: reliableVideoUrl, duration: 320 } }
                  }
                ]
              }
            }
          ]
        }
      }
    });
    console.log("Added course: Study Hacks & Time Management");
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
