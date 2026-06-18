/*
  Warnings:

  - You are about to drop the column `iconUrl` on the `Badge` table. All the data in the column will be lost.
  - You are about to drop the `Quest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserQuest` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Badge` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,badgeId]` on the table `UserBadge` will be added. If there are existing duplicate values, this will fail.

*/

-- DropForeignKey
ALTER TABLE "UserQuest" DROP CONSTRAINT "UserQuest_questId_fkey";

-- DropForeignKey
ALTER TABLE "UserQuest" DROP CONSTRAINT "UserQuest_userId_fkey";

-- AlterTable
ALTER TABLE "Badge" DROP COLUMN "iconUrl",
ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "availableUntil" TIMESTAMP(3),
ADD COLUMN     "collection" TEXT,
ADD COLUMN     "conditionFnId" TEXT,
ADD COLUMN     "illustrationUrl" TEXT,
ADD COLUMN     "isAnimated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rarity" TEXT NOT NULL DEFAULT 'common',
ADD COLUMN     "slug" TEXT,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thumbnailUrl" TEXT;

-- AlterTable
ALTER TABLE "LearningJourney" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT DEFAULT 'Helping girls navigate their journey with empathy and care.',
ADD COLUMN     "certifiedTopicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "completedSessionsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentorExpertise" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "mentorStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "pendingSafetyCheckin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionPrice" DOUBLE PRECISION DEFAULT 500,
ADD COLUMN     "specialisation" TEXT,
ADD COLUMN     "unavailableUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "fcmToken" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "peerOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "schoolId" TEXT,
ADD COLUMN     "tempPasswordExpiresAt" TIMESTAMP(3),
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "UserBadge" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceQuestId" TEXT;

-- AlterTable
ALTER TABLE "UserProgress" ADD COLUMN     "history" JSONB;

-- DropTable
DROP TABLE "Quest";

-- DropTable
DROP TABLE "UserQuest";

-- CreateTable
CREATE TABLE "QuestTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pointsBase" INTEGER NOT NULL,
    "pointsMax" INTEGER,
    "difficulty" TEXT NOT NULL DEFAULT 'standard',
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER,
    "estimatedMinutes" INTEGER NOT NULL,
    "completionCondition" JSONB NOT NULL,
    "phaseWeights" JSONB NOT NULL DEFAULT '{"luteal": 1, "menstrual": 1, "ovulation": 1, "follicular": 1}',
    "badgeRewardId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seasonalEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questTemplateId" TEXT NOT NULL,
    "questDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progressJson" JSONB NOT NULL DEFAULT '{}',
    "pointsAwarded" INTEGER,

    CONSTRAINT "UserDailyQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "userId" TEXT NOT NULL,
    "logStreakCurrent" INTEGER NOT NULL DEFAULT 0,
    "logStreakLongest" INTEGER NOT NULL DEFAULT 0,
    "logStreakStart" TIMESTAMP(3),
    "questStreakCurrent" INTEGER NOT NULL DEFAULT 0,
    "lastQuestCompletedDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserLevel" (
    "userId" TEXT NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "pointsTotal" INTEGER NOT NULL DEFAULT 0,
    "lastLevelUpAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SeasonalEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "availableUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodPrediction" BOOLEAN NOT NULL DEFAULT true,
    "dailyReminder" BOOLEAN NOT NULL DEFAULT true,
    "dailyReminderTime" TEXT NOT NULL DEFAULT '20:00',
    "symptomPatterns" BOOLEAN NOT NULL DEFAULT true,
    "latePeriod" BOOLEAN NOT NULL DEFAULT true,
    "streakAtRisk" BOOLEAN NOT NULL DEFAULT true,
    "monthlyInsights" BOOLEAN NOT NULL DEFAULT false,
    "phaseChange" BOOLEAN NOT NULL DEFAULT false,
    "doctorConnect" BOOLEAN NOT NULL DEFAULT true,
    "cycleMilestones" BOOLEAN NOT NULL DEFAULT true,
    "globalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deepLink" TEXT,
    "payload" JSONB DEFAULT '{}',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastMsgAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExpertChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertSessionSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "meetLink" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programId" TEXT,
    "sessionNumber" INTEGER,
    "razorpayPaymentId" TEXT,
    "razorpayOrderId" TEXT,
    "amount" DOUBLE PRECISION,

    CONSTRAINT "ExpertSessionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyId" TEXT,

    CONSTRAINT "CommunityBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityCircle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconEmoji" TEXT,
    "accentColor" TEXT,
    "minContentTier" "ContentTier",
    "maxContentTier" "ContentTier",
    "requiresPreReview" BOOLEAN NOT NULL DEFAULT false,
    "isAgeSpecific" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CommunityCircle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "venue" TEXT,
    "city" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "imageUrl" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "isAgeRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "attendeeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "circleId" TEXT,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING_AI',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isChallengeResponse" BOOLEAN NOT NULL DEFAULT false,
    "challengeId" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "aiDecision" "ModerationDecision",
    "aiConfidence" DOUBLE PRECISION,
    "aiFlags" JSONB NOT NULL DEFAULT '{}',
    "crisisSeverity" "CrisisSeverity" NOT NULL DEFAULT 'NONE',
    "humanReviewed" BOOLEAN NOT NULL DEFAULT false,
    "humanDecision" "ModerationDecision",
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reactionHeart" INTEGER NOT NULL DEFAULT 0,
    "reactionHug" INTEGER NOT NULL DEFAULT 0,
    "reactionBulb" INTEGER NOT NULL DEFAULT 0,
    "reactionFist" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReply" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentReplyId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING_AI',
    "aiDecision" "ModerationDecision",
    "crisisSeverity" "CrisisSeverity" NOT NULL DEFAULT 'NONE',
    "humanReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reactionHeart" INTEGER NOT NULL DEFAULT 0,
    "reactionHug" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "reactionBulb" INTEGER NOT NULL DEFAULT 0,
    "reactionFist" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CommunityReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "decision" "ModerationDecision" NOT NULL,
    "reasonCode" TEXT,
    "moderatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerLineMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "content" TEXT,
    "crisisFlag" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "mediaUrl" TEXT,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',

    CONSTRAINT "PeerLineMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerLineSession" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "mentorId" TEXT,
    "topicIds" TEXT[],
    "status" "PeerLineStatus" NOT NULL DEFAULT 'MATCHING',
    "requestedVerified" BOOLEAN NOT NULL DEFAULT false,
    "matchedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "menteeRating" INTEGER,
    "mentorRating" INTEGER,
    "hadCrisisFlag" BOOLEAN NOT NULL DEFAULT false,
    "menteeNote" TEXT,
    "mentorSelfRating" INTEGER,
    "mentorWellbeingOk" BOOLEAN,
    "mentorNeedsSupport" BOOLEAN,
    "mentorReadyForNext" BOOLEAN,
    "mentorModerationFlag" BOOLEAN,
    "mentorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerLineSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerLineTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL DEFAULT '#6D28D9',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerLineTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReaction" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyChallenge" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "promptsByCircle" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAppeal" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogAuthor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "twitterUrl" TEXT,
    "linkedInUrl" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,

    CONSTRAINT "BlogAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCTA" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "buttonText" TEXT,
    "buttonLink" TEXT,
    "imageUrl" TEXT,
    "type" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCTA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "thumbnailUrl" TEXT,
    "galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT,
    "seo" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "readTime" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogStats" (
    "id" TEXT NOT NULL,
    "instagramFollowers" TEXT NOT NULL DEFAULT '4.2k+',
    "facebookFollowers" TEXT NOT NULL DEFAULT '2.1k+',
    "linkedInFollowers" TEXT NOT NULL DEFAULT '1.5k+',
    "youtubeSubscribers" TEXT NOT NULL DEFAULT '1.2k+',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT,
    "photoUrl" TEXT,
    "vibeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "geohash" TEXT,
    "discoveryRadius" TEXT NOT NULL DEFAULT 'city',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendMessage" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestEmail" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "shippingAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "couponId" TEXT,
    "gstNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comments" JSONB DEFAULT '[]',

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "expiryDate" TIMESTAMP(3),
    "usageLimit" INTEGER NOT NULL DEFAULT 100,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerInsight" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "cycleDay" INTEGER,
    "previewTitle" TEXT NOT NULL,
    "previewEmoji" TEXT NOT NULL,
    "previewColorHex" TEXT NOT NULL DEFAULT '#A855F7',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackerInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerStory" (
    "id" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackerStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerArticle" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "cycleDay" INTEGER,
    "title" TEXT NOT NULL,
    "readTime" TEXT NOT NULL DEFAULT '3 min read',
    "emoji" TEXT NOT NULL DEFAULT '📖',
    "url" TEXT,
    "body" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackerArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "personalStatement" TEXT NOT NULL,
    "scenarioResponses" JSONB NOT NULL,
    "eligibility" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "certificationStatus" TEXT NOT NULL DEFAULT 'pending_training',
    "completedEpisodes" TEXT[],
    "trainingScore" INTEGER,
    "trainingAnswers" JSONB,
    "episodeAnswers" JSONB,
    "assessmentAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lockUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "certificateId" TEXT,
    "certifiedAt" TIMESTAMP(3),

    CONSTRAINT "PeerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MindfulActivity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "expertName" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "category" TEXT NOT NULL DEFAULT 'Meditation',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "points" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MindfulActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMindfulActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mindfulActivityId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMindfulActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT,
    "schoolType" TEXT,
    "cityState" TEXT,
    "totalGirls" INTEGER,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "preferredTime" TEXT,
    "goals" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "details" TEXT,
    "ngoDetail" TEXT,
    "type" TEXT NOT NULL DEFAULT 'school',
    "peerMentorName" TEXT,
    "preferredDate" TEXT,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "classRange" TEXT NOT NULL,
    "minClass" INTEGER NOT NULL,
    "maxClass" INTEGER NOT NULL,
    "sessions" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "topics" TEXT[],
    "pricePrivate" DOUBLE PRECISION NOT NULL,
    "priceGroup" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "curriculum" JSONB DEFAULT '[]',
    "consultations" JSONB DEFAULT '[]',
    "thumbnailUrl" TEXT,
    "enrolledCount" INTEGER NOT NULL DEFAULT 1200,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pricePaid" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guestEmail" TEXT,
    "guestName" TEXT,

    CONSTRAINT "ProgramEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoSession" (
    "id" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "classRange" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "interests" TEXT[],
    "hasMentor" TEXT NOT NULL,
    "challenges" TEXT[],
    "learningPref" TEXT NOT NULL,
    "parentInvolvement" TEXT NOT NULL,
    "suggestedPrograms" TEXT[],
    "slotDate" TEXT,
    "slotTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "comment" TEXT DEFAULT '',
    "isReadyToEnroll" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DemoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentLink" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "teenId" TEXT,
    "senderId" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRemindedAt" TIMESTAMP(3),

    CONSTRAINT "ParentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "principalName" TEXT,
    "principalDesignation" TEXT,
    "principalEmail" TEXT,
    "principalPhone" TEXT,
    "coordinatorName" TEXT NOT NULL,
    "coordinatorEmail" TEXT NOT NULL,
    "coordinatorPhone" TEXT NOT NULL,
    "mouSignedDate" TIMESTAMP(3) NOT NULL,
    "mouValidityStart" TIMESTAMP(3) NOT NULL,
    "mouValidityEnd" TIMESTAMP(3) NOT NULL,
    "tier" "SchoolTier" NOT NULL DEFAULT 'SEEDING',
    "totalMouValue" DOUBLE PRECISION,
    "paymentMode" TEXT,
    "assignedOpsManagerId" TEXT,
    "status" "SchoolStatus" NOT NULL DEFAULT 'PENDING_ONBOARDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolProgramConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradesEnrolled" TEXT[],
    "sessionsPerGrade" INTEGER NOT NULL DEFAULT 3,
    "totalStudentsContracted" INTEGER NOT NULL DEFAULT 0,
    "teacherTrainingSessions" INTEGER NOT NULL DEFAULT 1,
    "teacherTrainingDuration" TEXT NOT NULL DEFAULT 'HALF_DAY',
    "teacherTrainingModules" TEXT[],
    "parentWelcomeKit" BOOLEAN NOT NULL DEFAULT false,
    "parentWelcomeKitQuantity" INTEGER NOT NULL DEFAULT 0,
    "reportingFrequency" TEXT NOT NULL DEFAULT 'QUARTERLY',
    "certifiedSchoolBadge" BOOLEAN NOT NULL DEFAULT true,
    "mediaCoverageSupport" BOOLEAN NOT NULL DEFAULT false,
    "mediaCoverageTier" TEXT,
    "socialMediaContentPack" BOOLEAN NOT NULL DEFAULT true,
    "annualWellnessDay" BOOLEAN NOT NULL DEFAULT false,
    "annualWellnessDayDate" TIMESTAMP(3),
    "customDeliverables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolProgramConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "curriculumModule" TEXT NOT NULL,
    "proposedDate" TIMESTAMP(3) NOT NULL,
    "proposedTime" TEXT,
    "venue" TEXT,
    "facilitatorId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "actualDate" TIMESTAMP(3),
    "studentHeadcount" INTEGER,
    "attendanceRate" DOUBLE PRECISION,
    "facilitatorNotes" TEXT,
    "publicNotes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolTeacher" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "completedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "handbookDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolReport" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ReportType" NOT NULL DEFAULT 'QUARTERLY',
    "pdfUrl" TEXT NOT NULL,
    "opsCommentary" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolKitDispatch" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'DISPATCHED',
    "receiptDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolKitDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolMediaAsset" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AssetType" NOT NULL DEFAULT 'PHOTO_GALLERY',
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "month" TEXT,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolBadge" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "yearOfCertification" INTEGER NOT NULL,
    "isFoundingSchool" BOOLEAN NOT NULL DEFAULT false,
    "badgeUrl" TEXT NOT NULL,
    "criteriaCompletion" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolNoticeBoardItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolNoticeBoardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolStudent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "anonymizedId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT,
    "activationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CircleMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CircleMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CircleModerators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CircleModerators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PostCTAs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostCTAs_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PostCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "UserDailyQuest_userId_questDate_idx" ON "UserDailyQuest"("userId", "questDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyQuest_userId_questTemplateId_questDate_key" ON "UserDailyQuest"("userId", "questTemplateId", "questDate");

-- CreateIndex
CREATE INDEX "PointsLedger_userId_createdAt_idx" ON "PointsLedger"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "NotificationHistory_userId_type_idx" ON "NotificationHistory"("userId", "type");

-- CreateIndex
CREATE INDEX "NotificationHistory_sentAt_idx" ON "NotificationHistory"("sentAt");

-- CreateIndex
CREATE INDEX "ExpertChatSession_userId_idx" ON "ExpertChatSession"("userId");

-- CreateIndex
CREATE INDEX "ExpertChatSession_expertId_idx" ON "ExpertChatSession"("expertId");

-- CreateIndex
CREATE INDEX "ExpertChatMessage_sessionId_idx" ON "ExpertChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "ExpertSessionSchedule_userId_status_idx" ON "ExpertSessionSchedule"("userId", "status");

-- CreateIndex
CREATE INDEX "CommunityActivityLog_userId_circleId_idx" ON "CommunityActivityLog"("userId", "circleId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityActivityLog_userId_circleId_key" ON "CommunityActivityLog"("userId", "circleId");

-- CreateIndex
CREATE INDEX "CommunityBookmark_userId_postId_idx" ON "CommunityBookmark"("userId", "postId");

-- CreateIndex
CREATE INDEX "CommunityBookmark_userId_replyId_idx" ON "CommunityBookmark"("userId", "replyId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityBookmark_userId_postId_key" ON "CommunityBookmark"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityBookmark_userId_replyId_key" ON "CommunityBookmark"("userId", "replyId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityCircle_slug_key" ON "CommunityCircle"("slug");

-- CreateIndex
CREATE INDEX "CommunityPost_circleId_publishedAt_idx" ON "CommunityPost"("circleId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityReply_postId_publishedAt_idx" ON "CommunityReply"("postId", "publishedAt");

-- CreateIndex
CREATE INDEX "PeerLineMessage_sessionId_sentAt_idx" ON "PeerLineMessage"("sessionId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostReaction_contentId_contentType_userId_reaction_key" ON "PostReaction"("contentId", "contentType", "userId", "reaction");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogComment_postId_idx" ON "BlogComment"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendProfile_userId_key" ON "FriendProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendMatch_userId_targetId_key" ON "FriendMatch"("userId", "targetId");

-- CreateIndex
CREATE INDEX "FriendMessage_matchId_createdAt_idx" ON "FriendMessage"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCoupon_code_key" ON "DiscountCoupon"("code");

-- CreateIndex
CREATE INDEX "TrackerInsight_phase_isActive_idx" ON "TrackerInsight"("phase", "isActive");

-- CreateIndex
CREATE INDEX "TrackerStory_insightId_order_idx" ON "TrackerStory"("insightId", "order");

-- CreateIndex
CREATE INDEX "TrackerArticle_phase_isActive_idx" ON "TrackerArticle"("phase", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PeerApplication_userId_key" ON "PeerApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PeerApplication_certificateId_key" ON "PeerApplication"("certificateId");

-- CreateIndex
CREATE INDEX "ArticleBookmark_userId_idx" ON "ArticleBookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleBookmark_userId_postId_key" ON "ArticleBookmark"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMindfulActivity_userId_mindfulActivityId_key" ON "UserMindfulActivity"("userId", "mindfulActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Program_title_key" ON "Program"("title");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramEnrollment_userId_programId_key" ON "ProgramEnrollment"("userId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentLink_senderId_receiverPhone_key" ON "ParentLink"("senderId", "receiverPhone");

-- CreateIndex
CREATE UNIQUE INDEX "School_schoolId_key" ON "School"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolProgramConfig_schoolId_key" ON "SchoolProgramConfig"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolBadge_schoolId_key" ON "SchoolBadge"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolStudent_anonymizedId_key" ON "SchoolStudent"("anonymizedId");

-- CreateIndex
CREATE INDEX "_CircleMembers_B_index" ON "_CircleMembers"("B");

-- CreateIndex
CREATE INDEX "_CircleModerators_B_index" ON "_CircleModerators"("B");

-- CreateIndex
CREATE INDEX "_PostCTAs_B_index" ON "_PostCTAs"("B");

-- CreateIndex
CREATE INDEX "_PostCategories_B_index" ON "_PostCategories"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestTemplate" ADD CONSTRAINT "QuestTemplate_badgeRewardId_fkey" FOREIGN KEY ("badgeRewardId") REFERENCES "Badge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestTemplate" ADD CONSTRAINT "QuestTemplate_seasonalEventId_fkey" FOREIGN KEY ("seasonalEventId") REFERENCES "SeasonalEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyQuest" ADD CONSTRAINT "UserDailyQuest_questTemplateId_fkey" FOREIGN KEY ("questTemplateId") REFERENCES "QuestTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyQuest" ADD CONSTRAINT "UserDailyQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLevel" ADD CONSTRAINT "UserLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationHistory" ADD CONSTRAINT "NotificationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertChatSession" ADD CONSTRAINT "ExpertChatSession_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertChatSession" ADD CONSTRAINT "ExpertChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertChatMessage" ADD CONSTRAINT "ExpertChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExpertChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertSessionSchedule" ADD CONSTRAINT "ExpertSessionSchedule_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertSessionSchedule" ADD CONSTRAINT "ExpertSessionSchedule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertSessionSchedule" ADD CONSTRAINT "ExpertSessionSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityActivityLog" ADD CONSTRAINT "CommunityActivityLog_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CommunityCircle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityActivityLog" ADD CONSTRAINT "CommunityActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBookmark" ADD CONSTRAINT "CommunityBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBookmark" ADD CONSTRAINT "CommunityBookmark_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "CommunityReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBookmark" ADD CONSTRAINT "CommunityBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CommunityCircle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "WeeklyChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CommunityCircle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReply" ADD CONSTRAINT "CommunityReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReply" ADD CONSTRAINT "CommunityReply_parentReplyId_fkey" FOREIGN KEY ("parentReplyId") REFERENCES "CommunityReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReply" ADD CONSTRAINT "CommunityReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerLineMessage" ADD CONSTRAINT "PeerLineMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PeerLineSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerLineSession" ADD CONSTRAINT "PeerLineSession_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerLineSession" ADD CONSTRAINT "PeerLineSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAppeal" ADD CONSTRAINT "ModerationAppeal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "BlogAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendProfile" ADD CONSTRAINT "FriendProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendMatch" ADD CONSTRAINT "FriendMatch_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "FriendProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendMatch" ADD CONSTRAINT "FriendMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "FriendProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendMessage" ADD CONSTRAINT "FriendMessage_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "FriendMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "DiscountCoupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerStory" ADD CONSTRAINT "TrackerStory_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "TrackerInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerApplication" ADD CONSTRAINT "PeerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleBookmark" ADD CONSTRAINT "ArticleBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleBookmark" ADD CONSTRAINT "ArticleBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMindfulActivity" ADD CONSTRAINT "UserMindfulActivity_mindfulActivityId_fkey" FOREIGN KEY ("mindfulActivityId") REFERENCES "MindfulActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMindfulActivity" ADD CONSTRAINT "UserMindfulActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentLink" ADD CONSTRAINT "ParentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentLink" ADD CONSTRAINT "ParentLink_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentLink" ADD CONSTRAINT "ParentLink_teenId_fkey" FOREIGN KEY ("teenId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_assignedOpsManagerId_fkey" FOREIGN KEY ("assignedOpsManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProgramConfig" ADD CONSTRAINT "SchoolProgramConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSession" ADD CONSTRAINT "SchoolSession_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSession" ADD CONSTRAINT "SchoolSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolTeacher" ADD CONSTRAINT "SchoolTeacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolReport" ADD CONSTRAINT "SchoolReport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolKitDispatch" ADD CONSTRAINT "SchoolKitDispatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMediaAsset" ADD CONSTRAINT "SchoolMediaAsset_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolBadge" ADD CONSTRAINT "SchoolBadge_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolNoticeBoardItem" ADD CONSTRAINT "SchoolNoticeBoardItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudent" ADD CONSTRAINT "SchoolStudent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CircleMembers" ADD CONSTRAINT "_CircleMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "CommunityCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CircleMembers" ADD CONSTRAINT "_CircleMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CircleModerators" ADD CONSTRAINT "_CircleModerators_A_fkey" FOREIGN KEY ("A") REFERENCES "CommunityCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CircleModerators" ADD CONSTRAINT "_CircleModerators_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostCTAs" ADD CONSTRAINT "_PostCTAs_A_fkey" FOREIGN KEY ("A") REFERENCES "BlogCTA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostCTAs" ADD CONSTRAINT "_PostCTAs_B_fkey" FOREIGN KEY ("B") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostCategories" ADD CONSTRAINT "_PostCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "BlogCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostCategories" ADD CONSTRAINT "_PostCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
