import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PeerLine Mentor Certification Journey...');

  const journey = await prisma.learningJourney.upsert({
    where: { slug: 'peerline-mentor-certification' },
    update: {
      title: 'Peer Mentor Certification',
      description: 'The mandatory onboarding path for all prospective PeerLine Mentors. Master the skills of empathic listening, boundaries, and safeguarding.',
      isPremium: false,
      category: 'MENTORSHIP',
      thumbnailUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80',
    },
    create: {
      title: 'Peer Mentor Certification',
      slug: 'peerline-mentor-certification',
      description: 'The mandatory onboarding path for all prospective PeerLine Mentors. Master the skills of empathic listening, boundaries, and safeguarding.',
      isPremium: false,
      category: 'MENTORSHIP',
      thumbnailUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80',
    },
  });

  const episodes = [
    {
      title: 'Episode 1: What Is Peer Support?',
      slug: 'what-is-peer-support',
      description: 'Foundational ethics and the science of peer connection. Learn what peer support is—and what it isn’t.',
      order: 1,
      content: {
        overview: "This foundational episode grounds you in the science and ethics of peer mentoring. It explains what peer support actually is—and what it most certainly is not.",
        objectives: [
          "Define peer support and distinguish it from counselling",
          "Explain the neurological basis (co-regulation)",
          "Identify the three pillars: Empathy, boundaries, and hope",
          "Understand what peer support is NOT"
        ],
        modules: [
          { id: "1.1", title: "The Science of Peer Support", detail: "Mirror neurons and belonging theory. Peer connection changes brain chemistry differently from professional support." },
          { id: "1.2", title: "What Peer Support Is", detail: "Empathic presence, normalising experience, and sharing selectively from lived experience." },
          { id: "1.3", title: "Boundaries — The Invisible Architecture", detail: "Why boundaries are a gift. How to maintain them warmly. Scripts for boundary moments." }
        ],
        reflection: {
          title: "Episode 1 Reflection",
          prompt: "Write 150–200 words describing a moment when someone truly heard you—not fixed you, not advised you, just heard you. How did it feel? What did they do differently?"
        },
        check: [
          "What is the primary difference between a Peer Mentor and a licensed counsellor?",
          "Name two things that make peer support neurologically distinct from receiving professional help.",
          "A user asks you to tell them what to do about their relationship. How should you respond?",
          "What are the three foundational pillars of peer support on PeerLine?",
          "True or False: A Peer Mentor can share their own experience if it helps the user feel less alone."
        ]
      }
    },
    {
      title: 'Episode 2: Listening Without Fixing',
      slug: 'listening-without-fixing',
      description: 'The core skill of a mentor. Pause the instinct to solve and master the art of validation.',
      order: 2,
      content: {
        overview: "The instinct to fix, advise, and solve is deeply human — and it is precisely what you must learn to pause. This episode develops your active listening skills.",
        objectives: [
          "Apply five active listening techniques (SOLER)",
          "Validate emotions without minimising them",
          "Recognise and redirect the advice impulse",
          "Use open questions effectively"
        ],
        modules: [
          { id: "2.1", title: "The Anatomy of Active Listening", detail: "Summarise, Open questions, Label emotions, Explore gently, Reflect back." },
          { id: "2.2", title: "Validation", detail: "The three levels of validation. How to validate without agreeing with harmful beliefs." },
          { id: "2.3", title: "The Advice Trap", detail: "Why giving advice feels helpful but often isn't. The autonomy cost of unsolicited advice." }
        ],
        reflection: {
          title: "Episode 2 Practice",
          prompt: "Imagine a user says 'I feel like I'm failing at everything.' Write a response that validates their feeling without offering a solution."
        },
        check: [
          "A user says 'I know it sounds stupid but I cried all morning.' What is the best first response?",
          "What is the difference between sympathy and empathy in peer support?",
          "A user directly asks 'What do you think I should do?' How do you respond?",
          "Name three open questions you could ask a user who says they feel stuck.",
          "Why is response length important in text-based peer conversations?"
        ]
      }
    },
    {
      title: 'Episode 3: Safeguarding & Crisis Recognition',
      slug: 'safeguarding-crisis',
      description: 'The SAFE protocol. Learn to identify risks and escalate to the Safety Team.',
      order: 3,
      content: {
        overview: "Your most critical duty is safety. You will learn to recognise signs of crisis and follow the SAFE protocol.",
        nonNegotiable: "PeerLine Peer Mentors are not crisis counsellors. When a user's safety is at risk, your role is to acknowledge, stay calm, follow protocol, and facilitate professional support.",
        objectives: [
          "Identify warning signs of suicidal ideation and self-harm",
          "Follow the SAFE Crisis Protocol step-by-step",
          "Understand mandatory reporting obligations",
          "Share crisis resources clearly and compassionately"
        ],
        safeProtocol: [
          { step: "S — Stay", action: "Remain present", example: "Do not end the conversation. Keep the user talking." },
          { step: "A — Acknowledge", action: "Name the feeling", example: "'It sounds like you're in a lot of pain. I'm glad you told me.'" },
          { step: "F — Facilitate", action: "Connect to support", example: "Share relevant crisis line or in-app Safety Team contact." },
          { step: "E — Escalate", action: "Flag internally", example: "Use the Report button to notify the Safety Team immediately." }
        ],
        reflection: {
          title: "SAFE Protocol Practice",
          prompt: "Walk through how you would apply the SAFE protocol if a user said: 'I don't think I can go on anymore.'"
        },
        check: [
          "List four language signals in a user's message that might indicate they are at risk.",
          "True or False: Asking a user directly if they are thinking of suicide increases the chance they will attempt it.",
          "Walk through the SAFE protocol for a user who says 'I don't think I can go on anymore.'",
          "When does a Peer Mentor's confidentiality obligation end?",
          "A user asks you not to report their crisis. What do you do?"
        ]
      }
    },
    {
      title: 'Episode 4: Your Wellbeing as a Mentor',
      slug: 'mentor-wellbeing',
      description: 'Compassion fatigue and self-care. Protecting your own mental health while supporting others.',
      order: 4,
      content: {
        overview: "You cannot pour from an empty cup. This episode equips you to recognise burnout and build sustainable self-care.",
        objectives: [
          "Distinguish burnout from secondary traumatic stress",
          "Identify personal early warning signs of emotional overload",
          "Apply self-care strategies for peer supporters",
          "Use PeerLine's wellbeing features (Pause function, Mentor Circle)"
        ],
        modules: [
          { id: "4.1", title: "Understanding Secondary Trauma", detail: "Trauma symptoms that arise from prolonged exposure to others' traumatic experiences." },
          { id: "4.2", title: "Recognising Warning Signs", detail: "Physical, emotional, and cognitive indicators that you are approaching your limit." },
          { id: "4.3", title: "Compassion Fatigue Prevention", detail: "Decompression after sessions, journaling, and using the Pause feature." }
        ],
        reflection: {
          title: "Sustainability Plan",
          prompt: "Identify 3 early warning signs you'll watch for in yourself, and 2 self-care activities you'll commit to after difficult sessions."
        },
        check: [
          "What is the difference between burnout and secondary traumatic stress?",
          "Name three physical signs that you may be approaching compassion fatigue.",
          "A conversation left you feeling deeply unsettled. What should you do in the next 30 minutes?",
          "How does the PeerLine Pause feature work, and when should you use it?",
          "Why is peer-to-peer supervision (the Mentor Circle) important even after certification?"
        ]
      }
    }
  ];

  for (const ep of episodes) {
    await prisma.episode.upsert({
      where: { slug: ep.slug },
      update: {
        title: ep.title,
        description: ep.description,
        order: ep.order,
        content: ep.content,
        journeyId: journey.id,
      },
      create: {
        title: ep.title,
        slug: ep.slug,
        description: ep.description,
        order: ep.order,
        content: ep.content,
        journeyId: journey.id,
      },
    });
  }

  console.log('✅ PeerLine Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
