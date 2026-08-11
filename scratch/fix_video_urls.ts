import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing video URLs to a reliable source...");

  const reliableVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  const updateResult = await prisma.lmsVideo.updateMany({
    data: {
      videoUrl: reliableVideoUrl
    }
  });

  console.log(`Updated ${updateResult.count} videos to the reliable URL.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
