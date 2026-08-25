import { prisma } from "../src/db/client.js";
import { FirebaseService } from "../src/common/services/firebase.service.js";
import readline from "readline";

export interface TestTrigger {
  id: string;
  name: string;
  module: "Tracker" | "Family" | "Programs" | "Safety" | "Chat" | "Journey" | "Community" | "Content" | "Habit";
  title: string;
  body: string;
  deepLink: string;
  data?: Record<string, string>;
  description: string;
}

export const ALL_TRIGGERS: TestTrigger[] = [
  // ── 1. Tracker Module ──
  {
    id: "PERIOD_PREDICTION",
    name: "Period Prediction (3 Days Prior)",
    module: "Tracker",
    title: "Your period may be arriving soon 🩸",
    body: "Based on your cycle history, your period may start in about 3 days. Just a heads up — not a deadline 💜",
    deepLink: "infano://tracker/prediction",
    data: { notificationType: "PERIOD_PREDICTION" },
    description: "Triggered 3 days prior to predicted cycle start."
  },
  {
    id: "DAILY_CYCLE_INSIGHT",
    name: "Daily Cycle Morning Wisdom (8:30 AM)",
    module: "Tracker",
    title: "🌱 Day 7: Energy Rising",
    body: "Your energy is climbing! A wonderful day for creative tasks, fresh learning, and starting new goals ✨",
    deepLink: "infano://tracker",
    data: { notificationType: "DAILY_CYCLE_INSIGHT", phase: "follicular", cycleDay: "7" },
    description: "Personalized daily morning cycle micro-wisdom from Gigi based on active phase."
  },
  {
    id: "DAILY_LOG_REMINDER",
    name: "Daily Log Reminder (Streak / Check-in)",
    module: "Tracker",
    title: "🔥 Day 5 streak — keep it going!",
    body: "One minute of logging today builds a month of insights tomorrow. Tap to log now →",
    deepLink: "infano://tracker/log",
    data: { notificationType: "DAILY_LOG_REMINDER" },
    description: "Daily reminder configured at user preferred reminder time."
  },
  {
    id: "STREAK_AT_RISK",
    name: "Streak At Risk (10:00 PM Alert)",
    module: "Tracker",
    title: "Save your streak! 🔥",
    body: "Log today to save your 5-day tracking streak before midnight.",
    deepLink: "infano://tracker/log",
    data: { notificationType: "STREAK_AT_RISK" },
    description: "Fires at 10:00 PM local time if active streak user hasn't logged today."
  },
  {
    id: "PHASE_CHANGE_FOLLICULAR",
    name: "Phase Change: Follicular Phase",
    module: "Tracker",
    title: "Energy may be picking up soon 🌱",
    body: "You've entered your follicular phase. Tap to see what this means for your energy and mood.",
    deepLink: "infano://tracker/phase",
    data: { notificationType: "PHASE_CHANGE", phase: "follicular" },
    description: "Fires on day 1 of entering follicular phase."
  },
  {
    id: "PHASE_CHANGE_OVULATION",
    name: "Phase Change: Ovulation Phase",
    module: "Tracker",
    title: "Your peak phase may be starting ✨",
    body: "You've entered your ovulation phase. Tap to see what this means for your energy and mood.",
    deepLink: "infano://tracker/phase",
    data: { notificationType: "PHASE_CHANGE", phase: "ovulation" },
    description: "Fires on day 1 of entering ovulation phase."
  },
  {
    id: "PHASE_CHANGE_LUTEAL",
    name: "Phase Change: Luteal Phase",
    module: "Tracker",
    title: "Time to take it a little gentler 🌙",
    body: "You've entered your luteal phase. Tap to see what this means for your energy and mood.",
    deepLink: "infano://tracker/phase",
    data: { notificationType: "PHASE_CHANGE", phase: "luteal" },
    description: "Fires on day 1 of entering luteal phase."
  },
  {
    id: "LATE_PERIOD",
    name: "Late Period Alert (5 Days Late)",
    module: "Tracker",
    title: "Still waiting? 💜",
    body: "Your period is a few days later than expected — which is completely normal. Late periods happen for many reasons.",
    deepLink: "infano://tracker/insights",
    data: { notificationType: "LATE_PERIOD" },
    description: "Fires 5 days after predicted start date with no recorded flow."
  },
  {
    id: "SYMPTOM_PATTERN",
    name: "Symptom Pattern Detection",
    module: "Tracker",
    title: "Your body has a pattern 💡",
    body: "I've noticed a recurring pattern in your symptoms (cramps). There's something worth knowing about this 💜",
    deepLink: "infano://tracker/insights",
    data: { notificationType: "SYMPTOM_PATTERN", symptom: "cramps" },
    description: "Triggered when user logs same symptom >= 3 times in 30 days."
  },
  {
    id: "DOCTOR_CONNECT",
    name: "Doctor Connect Recommendation",
    module: "Tracker",
    title: "Your cycle has a pattern worth noting 🩺",
    body: "You've logged intense symptoms for 3 months. While often normal, it might be helpful to share with a provider.",
    deepLink: "infano://tracker/doctor-connect",
    data: { notificationType: "DOCTOR_CONNECT" },
    description: "Clinical prompt triggered on severe cramps (>=4) or bleeding (>8d) for 3 cycles."
  },
  {
    id: "CYCLE_MILESTONE",
    name: "Cycle Milestone (1st Full Cycle)",
    module: "Tracker",
    title: "You completed your first full cycle! 🌸",
    body: "You've logged your way through a complete cycle — that's real self-knowledge. See your first snapshot.",
    deepLink: "infano://tracker/insights",
    data: { notificationType: "CYCLE_MILESTONE", milestone: "first_cycle" },
    description: "Fires once upon completing first full logged cycle."
  },
  {
    id: "MONTHLY_INSIGHTS",
    name: "Monthly Insights Ready",
    module: "Tracker",
    title: "Your Monthly Insights are ready! 📊",
    body: "Your monthly reflection and analytics are compiled. Tap to view your insights summary 💜",
    deepLink: "infano://tracker/insights",
    data: { notificationType: "MONTHLY_INSIGHTS" },
    description: "Fires on the 1st of every calendar month."
  },

  // ── 2. Content & Blog Publishing ──
  {
    id: "NEW_BLOG_ARTICLE_PUBLISHED",
    name: "📚 New Blog Article Broadcast",
    module: "Content",
    title: "📚 New Article: Demystifying PCOS & Hormonal Balance",
    body: "Understand the early signs of PCOS and holistic nutrition tips by Dr. Ananya Sen ✨",
    deepLink: "infano://blog/demystifying-pcos",
    data: { notificationType: "NEW_BLOG_ARTICLE_PUBLISHED", slug: "demystifying-pcos" },
    description: "Multicast broadcast dispatched automatically when an admin publishes a new blog post."
  },

  // ── 3. Parent & Family Module ──
  {
    id: "PARENT_WEEKLY_DIGEST",
    name: "📊 Weekly Parent Digest (Sunday 10 AM)",
    module: "Family",
    title: "📊 Weekly Family Digest Ready",
    body: "Review Maya's weekly wellness milestones and 3 suggested conversation starters for this week 💙",
    deepLink: "infano://account/family",
    data: { notificationType: "PARENT_WEEKLY_DIGEST" },
    description: "Dispatched Sunday mornings summarizing teen journey progress and conversation tips."
  },
  {
    id: "linkRequest",
    name: "Family Link Request Received",
    module: "Family",
    title: "Link Request Received",
    body: "Priya Sharma wants to link accounts with you on Infano Care. Open Family Settings in your app to accept.",
    deepLink: "infano://account/family",
    data: { notificationType: "linkRequest" },
    description: "Sent to invitee when a linking request is sent."
  },
  {
    id: "linkAcceptance",
    name: "Family Link Request Accepted",
    module: "Family",
    title: "Link Request Accepted",
    body: "Priya Sharma has accepted your account linking request.",
    deepLink: "infano://account/family",
    data: { notificationType: "linkAcceptance" },
    description: "Sent to original inviter when link invite is accepted."
  },
  {
    id: "linkDeclined",
    name: "Family Link Request Declined",
    module: "Family",
    title: "Link Request Declined",
    body: "Priya Sharma has declined your account linking request.",
    deepLink: "infano://account/family",
    data: { notificationType: "linkDeclined" },
    description: "Sent to inviter when link request is declined."
  },
  {
    id: "sessionReminder15Min",
    name: "15-Minute Expert Session Reminder",
    module: "Family",
    title: "Session Starting Soon",
    body: "Your session with Dr. Ananya Sen starts in 15 minutes.",
    deepLink: "infano://expert/chat/demo-session-id",
    data: { notificationType: "sessionReminder15Min", sessionId: "demo-session-id" },
    description: "Fires 15 minutes before an expert consultation session."
  },

  // ── 4. Safety & Mental Distress Safety Net ──
  {
    id: "DAUGHTER_CRISIS_CHAT_ALERT",
    name: "💜 Parent Alert: Daughter Distress in Chat",
    module: "Safety",
    title: "💜 Sensitive Alert: Check in with Maya",
    body: "Maya recently expressed feelings of sadness or emotional distress in the app. Consider reaching out with a gentle, supportive check-in.",
    deepLink: "infano://account/family",
    data: { notificationType: "DAUGHTER_CRISIS_ALERT", source: "chat" },
    description: "Dispatched to linked parent when daughter mentions self-harm, sadness, or crisis in chat."
  },
  {
    id: "DAUGHTER_DISTRESS_JOURNAL_ALERT",
    name: "💜 Parent Alert: Daughter Journal Distress",
    module: "Safety",
    title: "💜 Sensitive Alert: Check in with Maya",
    body: "Maya recently logged a difficult emotional reflection in her journal. Consider reaching out with a gentle, supportive check-in.",
    deepLink: "infano://account/family",
    data: { notificationType: "DAUGHTER_CRISIS_ALERT", source: "journal" },
    description: "Dispatched to linked parent when daughter writes extreme distress entries in her journal."
  },
  {
    id: "SOS_ALERT",
    name: "🚨 SOS Emergency Alert (Live GPS)",
    module: "Safety",
    title: "🚨 SOS Alert: Maya needs help",
    body: "🚨 SOS Alert from Maya: Medical Emergency. Live location: https://maps.google.com/?q=28.6139,77.2090. Sent at: 07:15 PM. Please contact them or call emergency services (112).",
    deepLink: "infano://safety/sos",
    data: { notificationType: "SOS_ALERT", incidentId: "sos-test-incident" },
    description: "Urgent emergency broadcast to all trusted contacts with GPS link."
  },
  {
    id: "SOS_RESOLVED",
    name: "✅ SOS Emergency Resolved (Safe)",
    module: "Safety",
    title: "✅ SOS Resolved: Maya is safe",
    body: "✅ Maya has marked themselves as safe. The SOS alert has been resolved. Thank you for being there. 💙",
    deepLink: "infano://safety/sos",
    data: { notificationType: "SOS_RESOLVED", incidentId: "sos-test-incident" },
    description: "Broadcast to trusted contacts when user marks safe."
  },

  // ── 5. Creative Journey Module ──
  {
    id: "CREATIVE_EPISODE_UNLOCKED",
    name: "Creative Episode Unlocked",
    module: "Journey",
    title: "🎉 Episode Unlocked: \"Hormones & Skin Glow\"",
    body: "You finished \"Body Signals\"! Tap to continue your creative journey ✨",
    deepLink: "infano://creative-journey/episode/ep-2",
    data: { notificationType: "CREATIVE_EPISODE_UNLOCKED", episodeId: "ep-2" },
    description: "Fires when user completes an episode and unlocks the next one."
  },
  {
    id: "CREATIVE_DAILY_PROMPT",
    name: "Creative Journey Daily Prompt",
    module: "Journey",
    title: "✨ Your Daily Story Prompt is Ready!",
    body: "Explore today's interactive scenario and build your bloom points 🌸",
    deepLink: "infano://creative-journey",
    data: { notificationType: "CREATIVE_DAILY_PROMPT" },
    description: "Daily reminder to engage with story nodes."
  },
  {
    id: "CREATIVE_JOURNEY_COMPLETED",
    name: "Creative Journey Completed (Badge Earned)",
    module: "Journey",
    title: "👑 Journey Completed: Puberty Unlocked!",
    body: "You've completed every episode in \"Puberty Unlocked\"! Tap to view your milestone badge 🏆",
    deepLink: "infano://creative-journey",
    data: { notificationType: "CREATIVE_JOURNEY_COMPLETED", journeyId: "journey-1" },
    description: "Fires when user completes all episodes in a creative journey."
  },
  {
    id: "PARENT_TEEN_JOURNEY_PROGRESS",
    name: "Parent Alert: Teen Journey Milestone",
    module: "Journey",
    title: "🌟 Learning Progress: Maya",
    body: "Maya just completed Episode \"Hormones & Skin Glow\" in Puberty Unlocked!",
    deepLink: "infano://account/family",
    data: { notificationType: "PARENT_TEEN_JOURNEY_PROGRESS", teenId: "teen-123" },
    description: "Sent to linked parent when teen finishes an episode or journey."
  },

  // ── 6. Habit & Retention (Mindful & LMS) ──
  {
    id: "DAILY_MINDFULNESS_REMINDER",
    name: "🧘 Daily Mindfulness Breathwork Break (6:00 PM)",
    module: "Habit",
    title: "🧘 Take a 2-Minute Breathing Reset",
    body: "Unwind your day with a calming 4-7-8 breathing exercise. Tap to begin 🌸",
    deepLink: "infano://mindful",
    data: { notificationType: "DAILY_MINDFULNESS_REMINDER" },
    description: "Daily evening reminder to practice calming breathwork."
  },
  {
    id: "COURSE_INACTIVITY_NUDGE",
    name: "🎯 LMS Course Progress Nudge",
    module: "Habit",
    title: "🎯 Continue Your Learning Progress!",
    body: "You're 60% through 'Teen Leadership & Confidence'. Take 5 minutes to complete the next lesson ✨",
    deepLink: "infano://lms/course/course-1",
    data: { notificationType: "COURSE_INACTIVITY_NUDGE", courseId: "course-1" },
    description: "Sent after 3 days of course inactivity to encourage module completion."
  },

  // ── 7. Connect & Community Module ──
  {
    id: "COMMUNITY_POST_REPLIED",
    name: "Community: New Reply on Your Post",
    module: "Community",
    title: "Diya Sharma replied to your post 💬",
    body: "\"I had the exact same experience! Here's what helped me...\" in #wellness",
    deepLink: "infano://community/post/post-123",
    data: { notificationType: "COMMUNITY_POST_REPLIED", postId: "post-123" },
    description: "Sent to post author when someone comments on their discussion."
  },
  {
    id: "COMMUNITY_REPLY_REPLIED",
    name: "Community: Reply on Your Comment",
    module: "Community",
    title: "Sneha replied to your comment 💬",
    body: "\"Thank you so much for this advice, it really helped! 💜\"",
    deepLink: "infano://community/post/post-123",
    data: { notificationType: "COMMUNITY_REPLY_REPLIED", postId: "post-123" },
    description: "Sent when another user replies to your comment."
  },
  {
    id: "COMMUNITY_REACTION_MILESTONE",
    name: "Community: Post Support Reaction",
    module: "Community",
    title: "Ananya supported your post 💜",
    body: "Someone gave your post a love reaction!",
    deepLink: "infano://community/post/post-123",
    data: { notificationType: "COMMUNITY_REACTION_MILESTONE", postId: "post-123" },
    description: "Sent when a user reacts with support to your post."
  },
  {
    id: "COMMUNITY_CIRCLE_NEW_PROMPT",
    name: "Community: Circle Weekly Discussion",
    module: "Community",
    title: "Fresh Discussion in #PeriodTalk 🌸",
    body: "\"What's your go-to comforting habit during period cramps?\" Join the conversation ✨",
    deepLink: "infano://community/circle/circle-1",
    data: { notificationType: "COMMUNITY_CIRCLE_NEW_PROMPT" },
    description: "Community prompt for joined circles."
  },

  // ── 8. Programs & Mentorship Module ──
  {
    id: "sessionScheduled",
    name: "Live Batch Session Scheduled",
    module: "Programs",
    title: "Live Session Scheduled: Puberty & Hormones Mastery",
    body: "Your Session 1 for 'Puberty & Hormones Mastery' with Dr. Ananya Sen is scheduled for Friday, 28 Aug 2026 at 04:30 PM IST.",
    deepLink: "infano://programs/sessions",
    data: { notificationType: "sessionScheduled", programId: "prog-123" },
    description: "Sent to students and linked parents when admin/mentor schedules session."
  },
  {
    id: "sessionRescheduled",
    name: "Live Batch Session Rescheduled",
    module: "Programs",
    title: "Session Rescheduled: Puberty & Hormones Mastery",
    body: "Your Session 1 for 'Puberty & Hormones Mastery' with Dr. Ananya Sen has been rescheduled to Saturday, 29 Aug 2026 at 05:00 PM IST.",
    deepLink: "infano://programs/sessions",
    data: { notificationType: "sessionRescheduled", programId: "prog-123" },
    description: "Sent when a session date or time is modified."
  },
  {
    id: "programEnrolled",
    name: "Program Enrollment Welcome",
    module: "Programs",
    title: "Welcome to Teen Confidence & Wellness! 🎉",
    body: "You are officially enrolled in 'Teen Confidence & Wellness'. Access your curriculum and batch sessions in your dashboard.",
    deepLink: "infano://programs/sessions",
    data: { notificationType: "programEnrolled", programId: "prog-123" },
    description: "Fires immediately upon enrolling in a paid or cohort program."
  },
  {
    id: "demoSessionBooked",
    name: "Demo Session Confirmed (₹29)",
    module: "Programs",
    title: "Demo Session Confirmed 🌟",
    body: "Your interactive demo session is booked for Tomorrow at 05:00 PM (Paid ₹29). An expert mentor will connect with you soon!",
    deepLink: "infano://programs/demos",
    data: { notificationType: "demoSessionBooked", amount: "29" },
    description: "Fires after payment for a ₹29 demo session."
  },

  // ── 9. Real-Time Chat Modules ──
  {
    id: "FRIENDS_CHAT",
    name: "Friends Direct Chat Message",
    module: "Chat",
    title: "Ananya",
    body: "Hey! Are you coming to the workshop today? Let's join together! 😊",
    deepLink: "infano://friends/chat/match-123",
    data: { type: "FRIENDS_CHAT", matchId: "match-123" },
    description: "Direct message preview with smart active screen suppression."
  },
  {
    id: "PEERLINE_CHAT",
    name: "PeerLine Mentorship Chat Message",
    module: "Chat",
    title: "Diya (Mentor)",
    body: "🎤 Voice note (0:45) — 'Remember to take a few deep breaths, you've got this!'",
    deepLink: "infano://peerline/chat/session-456",
    data: { type: "PEERLINE_CHAT", sessionId: "session-456" },
    description: "Mentee-mentor message notification with voice/photo preview support."
  },
  {
    id: "EXPERT_CHAT",
    name: "Expert Doctor Consultation Message",
    module: "Chat",
    title: "Dr. Rohini (Gynaecologist)",
    body: "I've reviewed your symptom logs from this week. Here are the recommendations...",
    deepLink: "infano://expert/chat/expert-session-789",
    data: { type: "EXPERT_CHAT", sessionId: "expert-session-789" },
    description: "Medical consultation direct messaging alert."
  }
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dispatchTrigger(user: { id: string; fcmToken?: string | null; username?: string | null; phone?: string | null; profile?: { displayName?: string | null } | null }, trigger: TestTrigger) {
  const userName = user.profile?.displayName || user.username || user.phone || user.id;
  console.log(`\n────────────────────────────────────────────────────────────`);
  console.log(`▶ Firing [${trigger.module}] Trigger: ${trigger.name}`);
  console.log(`  Title: ${trigger.title}`);
  console.log(`  Body: ${trigger.body}`);
  console.log(`  DeepLink: ${trigger.deepLink}`);
  console.log(`  Target User: ${userName} (${user.id})`);

  let pushSent = false;
  let dbSaved = false;

  // 1. Send Push Notification via Firebase
  if (user.fcmToken) {
    try {
      const res = await FirebaseService.sendPushNotification(user.fcmToken, {
        title: trigger.title,
        body: trigger.body,
        deepLink: trigger.deepLink,
        data: trigger.data
      });
      if (res) {
        console.log(`  ✅ FCM Push Notification Dispatched! (Message ID: ${res})`);
        pushSent = true;
      } else {
        console.log(`  ⚠️ FirebaseService returned null (check Firebase credentials).`);
      }
    } catch (err: any) {
      console.error(`  ❌ Failed to send FCM Push:`, err?.message || err);
    }
  } else {
    console.log(`  ⚠️ User has NO fcmToken registered in database.`);
  }

  // 2. Write to NotificationHistory in DB (In-App Notification Center)
  try {
    await prisma.notificationHistory.create({
      data: {
        userId: user.id,
        type: trigger.id,
        title: trigger.title,
        body: trigger.body,
        deepLink: trigger.deepLink,
        payload: trigger.data || {},
        sentAt: new Date()
      }
    });
    console.log(`  ✅ In-App NotificationHistory Record Created in Database.`);
    dbSaved = true;
  } catch (err: any) {
    console.error(`  ❌ Failed to save NotificationHistory:`, err?.message || err);
  }

  return { pushSent, dbSaved };
}

async function main() {
  console.log(`============================================================`);
  console.log(`       INFANO CARE — PUSH NOTIFICATION TEST SUITE           `);
  console.log(`============================================================\n`);

  const usersWithTokens = await prisma.user.findMany({
    where: {
      fcmToken: { not: null }
    },
    select: {
      id: true,
      phone: true,
      email: true,
      username: true,
      fcmToken: true,
      role: true,
      profile: {
        select: { displayName: true }
      }
    },
    take: 10
  });

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      email: true,
      username: true,
      fcmToken: true,
      role: true,
      profile: {
        select: { displayName: true }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 5
  });

  const targetUsersList = usersWithTokens.length > 0 ? usersWithTokens : allUsers;

  if (targetUsersList.length === 0) {
    console.log("❌ No users found in database. Please register or log in on mobile app first.");
    process.exit(1);
  }

  // Parse CLI args
  const args = process.argv.slice(2);
  const isBatchAll = args.includes("--all");
  const isListOnly = args.includes("--list") || args.includes("-l");
  const specificTriggerArg = args.find(a => a.startsWith("--trigger="))?.split("=")[1];
  const moduleArg = args.find(a => a.startsWith("--module="))?.split("=")[1];
  const userArg = args.find(a => a.startsWith("--user="))?.split("=")[1];

  if (isListOnly) {
    console.log("📋 Available triggers to test:\n");
    ALL_TRIGGERS.forEach((t, i) => {
      console.log(`  [${(i + 1).toString().padStart(2)}] ID: ${t.id.padEnd(30)} | Module: ${t.module.padEnd(10)} | ${t.name}`);
    });
    console.log(`\nUsage examples:`);
    console.log(`  npm run test:notifications -- --all`);
    console.log(`  npm run test:notifications -- --module=Content`);
    console.log(`  npm run test:notifications -- --module=Tracker`);
    console.log(`  npm run test:notifications -- --module=Habit`);
    console.log(`  npm run test:notifications -- --trigger=NEW_BLOG_ARTICLE_PUBLISHED --user=+919742802062`);
    process.exit(0);
  }

  // Select target user
  let selectedUser = targetUsersList.find(u => u.fcmToken) || targetUsersList[0];
  if (userArg) {
    const matched = targetUsersList.find(u => u.id === userArg || u.phone === userArg || (u.phone && u.phone.includes(userArg)));
    if (matched) selectedUser = matched;
  }

  console.log(`🎯 Target Device / User: ${selectedUser.profile?.displayName || selectedUser.username || selectedUser.id} (${selectedUser.phone || 'No phone'})`);
  console.log(`   FCM Status: ${selectedUser.fcmToken ? '✅ Registered Token (' + selectedUser.fcmToken.slice(0, 20) + '...)' : '❌ No Token'}\n`);

  if (isBatchAll) {
    console.log(`🚀 Running FULL BATCH TEST for all ${ALL_TRIGGERS.length} notification triggers...`);
    for (let i = 0; i < ALL_TRIGGERS.length; i++) {
      const trigger = ALL_TRIGGERS[i];
      console.log(`\n[${i + 1}/${ALL_TRIGGERS.length}] Processing: ${trigger.name}`);
      await dispatchTrigger(selectedUser, trigger);
      if (i < ALL_TRIGGERS.length - 1) {
        console.log(`⏳ Waiting 2.5 seconds before next alert...`);
        await sleep(2500);
      }
    }
    console.log(`\n🎉 FULL BATCH TEST COMPLETED FOR ALL ${ALL_TRIGGERS.length} TRIGGERS! Check your device notifications.`);
    process.exit(0);
  }

  if (moduleArg) {
    const subset = ALL_TRIGGERS.filter(t => t.module.toLowerCase() === moduleArg.toLowerCase());
    if (subset.length === 0) {
      console.log(`❌ No triggers found for module '${moduleArg}'. Valid modules: Tracker, Content, Family, Safety, Journey, Habit, Community, Programs, Chat`);
      process.exit(1);
    }
    console.log(`🚀 Running all ${subset.length} triggers for module: ${moduleArg}...`);
    for (let i = 0; i < subset.length; i++) {
      await dispatchTrigger(selectedUser, subset[i]);
      if (i < subset.length - 1) {
        console.log(`⏳ Waiting 2.5s...`);
        await sleep(2500);
      }
    }
    console.log(`\n🎉 Completed module test for ${moduleArg}!`);
    process.exit(0);
  }

  if (specificTriggerArg) {
    const matched = ALL_TRIGGERS.find(t => t.id.toLowerCase() === specificTriggerArg.toLowerCase());
    if (matched) {
      await dispatchTrigger(selectedUser, matched);
      process.exit(0);
    } else {
      console.log(`❌ Unknown trigger: ${specificTriggerArg}. Run with --list to see all valid trigger IDs.`);
      process.exit(1);
    }
  }

  // Interactive CLI if no args supplied
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

  console.log(`📱 Users available for testing:`);
  targetUsersList.forEach((u, idx) => {
    const hasToken = u.fcmToken ? `✅ Token Active` : `❌ No Token`;
    const name = u.profile?.displayName || u.username || u.phone || u.id;
    console.log(`  [${idx + 1}] ${name} | ${u.phone || 'N/A'} | ${hasToken}`);
  });

  const userChoice = await prompt(`\nSelect user index [1-${targetUsersList.length}] (default: 1): `);
  const userIdx = parseInt(userChoice || "1", 10) - 1;
  if (targetUsersList[userIdx]) {
    selectedUser = targetUsersList[userIdx];
  }

  console.log(`\n─── TEST OPTIONS ───`);
  console.log(`  [A] 🔥 Run ALL ${ALL_TRIGGERS.length} Triggers in Sequence (Full Batch Test with 2.5s delay)`);
  console.log(`  [1] 🩸 Period & Cycle Tracker Triggers (12 triggers)`);
  console.log(`  [2] 📚 Content & Blog Publishing Broadcast (1 trigger)`);
  console.log(`  [3] 👨‍👩‍👧 Parent & Family Linking Triggers (5 triggers)`);
  console.log(`  [4] 💜 Safety & Crisis Alert Triggers (4 triggers)`);
  console.log(`  [5] 🎨 Creative Journey Triggers (4 triggers)`);
  console.log(`  [6] 🧘 Habit & Retention Triggers (2 triggers)`);
  console.log(`  [7] 💬 Community & Connect Triggers (4 triggers)`);
  console.log(`  [8] 🎓 Programs & Mentorship Triggers (4 triggers)`);
  console.log(`  [9] 🗨️ Real-Time Direct Chat Triggers (3 triggers)`);
  console.log(`  [L] 📋 List and Pick an Individual Trigger by Number`);
  console.log(`  [Q] Quit\n`);

  const choice = (await prompt(`Enter choice [A/1-9/L/Q]: `)).trim().toUpperCase();

  if (choice === "A") {
    console.log(`\n🚀 Starting FULL BATCH TEST for all ${ALL_TRIGGERS.length} triggers...`);
    for (let i = 0; i < ALL_TRIGGERS.length; i++) {
      const trigger = ALL_TRIGGERS[i];
      console.log(`\n[${i + 1}/${ALL_TRIGGERS.length}] Processing: ${trigger.name}`);
      await dispatchTrigger(selectedUser, trigger);
      if (i < ALL_TRIGGERS.length - 1) {
        console.log(`⏳ Waiting 2.5s...`);
        await sleep(2500);
      }
    }
    console.log(`\n🎉 FULL BATCH TEST COMPLETED! Check your device.`);
  } else if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(choice)) {
    const modMap: Record<string, "Tracker" | "Content" | "Family" | "Safety" | "Journey" | "Habit" | "Community" | "Programs" | "Chat"> = {
      "1": "Tracker",
      "2": "Content",
      "3": "Family",
      "4": "Safety",
      "5": "Journey",
      "6": "Habit",
      "7": "Community",
      "8": "Programs",
      "9": "Chat"
    };
    const mod = modMap[choice];
    const subset = ALL_TRIGGERS.filter(t => t.module === mod);
    console.log(`\n🚀 Running all ${subset.length} triggers for module: ${mod}...`);
    for (let i = 0; i < subset.length; i++) {
      await dispatchTrigger(selectedUser, subset[i]);
      if (i < subset.length - 1) {
        console.log(`⏳ Waiting 2.5s...`);
        await sleep(2500);
      }
    }
    console.log(`\n🎉 Completed module test for ${mod}!`);
  } else if (choice === "L") {
    console.log(`\nALL INDIVIDUAL TRIGGERS:`);
    ALL_TRIGGERS.forEach((t, i) => {
      console.log(`  [${i + 1}] [${t.module}] ${t.name} (${t.id})`);
    });
    const trigChoice = await prompt(`\nEnter trigger number [1-${ALL_TRIGGERS.length}]: `);
    const trigIdx = parseInt(trigChoice, 10) - 1;
    if (ALL_TRIGGERS[trigIdx]) {
      await dispatchTrigger(selectedUser, ALL_TRIGGERS[trigIdx]);
    } else {
      console.log("❌ Invalid trigger choice.");
    }
  }

  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
