import { PrismaClient, PostStatus, ModerationDecision, CrisisSeverity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample community posts...');

  // 1. Get Circles
  const periodTalk = await prisma.communityCircle.findUnique({
    where: { slug: 'periods-body' }
  });

  const teenRoom = await prisma.communityCircle.findUnique({
    where: { slug: 'teen_community' }
  });

  // 2. Get a User (Teen/Mentee)
  const user = await prisma.user.findFirst({
    where: { role: 'TEEN' }
  });

  if (!periodTalk || !user) {
    console.error('❌ Could not find Period Talk circle or a MENTEE user. Please run base seeds first.');
    return;
  }

  // Delete old invalid-ID pinned post if it still exists
  await prisma.communityPost.deleteMany({
    where: { id: 'pinned-post-1' }
  });

  // 3. Create Pinned Post in Period Talk with a valid UUID
  await prisma.communityPost.upsert({
    where: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    update: {},
    create: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      circleId: periodTalk.id,
      authorId: user.id,
      content: 'Welcome to Period Talk! 🩸 This is a safe space to share experiences, tips, and support. Please read our guidelines before posting.',
      isPinned: true,
      status: PostStatus.APPROVED,
      aiDecision: ModerationDecision.APPROVE,
      aiConfidence: 0.99,
      reactionHeart: 12,
      reactionHug: 8,
      reactionBulb: 5,
    }
  });

  // 4. Create Standard Posts
  const post1 = await prisma.communityPost.create({
    data: {
      circleId: periodTalk.id,
      authorId: user.id,
      content: 'Has anyone tried using heat patches for school? My cramps are really bad today. 🌸',
      status: PostStatus.APPROVED,
      reactionHeart: 4,
      reactionHug: 7,
      replyCount: 2,
    }
  });

  await prisma.communityPost.create({
    data: {
      circleId: periodTalk.id,
      authorId: user.id,
      content: 'Just started tracking my cycle properly using the Infano tracker! It feels so much better to know what is coming. 💡',
      status: PostStatus.APPROVED,
      reactionBulb: 15,
      reactionFist: 10,
    }
  });

  // 5. Create Replies to Post 1
  await prisma.communityReply.create({
    data: {
      postId: post1.id,
      authorId: user.id,
      content: 'Yes! They are a life-saver. I always keep one in my locker just in case. 🤗',
    }
  });

  await prisma.communityReply.create({
    data: {
      postId: post1.id,
      authorId: user.id,
      content: 'Also try some ginger tea in the morning, it really helps with the bloat! ☕',
    }
  });

  // 6. Create Post in Teen Age Room
  if (teenRoom) {
    await prisma.communityPost.create({
      data: {
        circleId: teenRoom.id,
        authorId: user.id,
        content: 'Hi everyone! 👋 So glad we have this space for just us. Hope you all are having a great week!',
        status: PostStatus.APPROVED,
        reactionHeart: 20,
        reactionFist: 5,
      }
    });
  }

  console.log('✅ Seeded posts and replies successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
