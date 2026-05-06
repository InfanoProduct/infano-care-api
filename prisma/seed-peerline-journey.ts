import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Comprehensive PeerLine Mentor Certification Journey...');

  const journey = await prisma.learningJourney.upsert({
    where: { slug: 'peerline-mentor-certification' },
    update: {
      description: 'The official training journey for prospective PeerLine mentors. 4 Episodes + 1 Final Assessment = Certified Peer Mentor.',
    },
    create: {
      title: 'PeerLine Mentor Certification',
      slug: 'peerline-mentor-certification',
      description: 'The official training journey for prospective PeerLine mentors. 4 Episodes + 1 Final Assessment = Certified Peer Mentor.',
      category: 'Peer Support',
      isActive: true,
      totalXP: 1000,
    }
  });

  const episodes = [
    {
      order: 1,
      title: 'Episode 1: What Is Peer Support?',
      slug: 'peerline-ep1-what-is-peer-support',
      description: 'This foundational episode grounds you in the science and ethics of peer mentoring.',
      content: {
        overview: 'This foundational episode grounds you in the science and ethics of peer mentoring. It explains what peer support actually is—and what it most certainly is not.',
        objectives: [
          'Define peer support and distinguish it from counselling, therapy, and friendship',
          'Explain the neurological and psychological basis for why the lived-experience connection is powerful',
          'Describe the role of a Peer Mentor and its clear limits',
          'Identify the three foundational pillars: Empathy, boundaries, and hope',
          'Articulate what peer support is NOT (clinical diagnosis, advice-giving, rescue)'
        ],
        modules: [
          { id: '1.1', title: 'The Science of Peer Support', detail: 'Mirror neurons, co-regulation, belonging theory, and why peer connection changes brain chemistry differently from professional support.' },
          { id: '1.2', title: 'What Peer Support Is', detail: 'Empathic presence, normalising experience, sharing (selectively) from lived experience, and holding hope.' },
          { id: '1.3', title: 'What Peer Support Is Not', detail: 'Not therapy. Not advice. Not friendship. Not rescue. The risks of role confusion and how to avoid them.' },
          { id: '1.4', title: 'Boundaries — The Invisible Architecture', detail: 'Why boundaries are a gift, not a barrier. How to maintain them warmly. Scripts for boundary moments.' },
          { id: '1.5', title: 'The Peer Mentor Role on PeerLine', detail: 'Platform-specific expectations, what a typical conversation looks like, what happens at the end of a session.' }
        ],
        reflection: {
          title: 'Episode 1 Reflection',
          prompt: 'Write 150–200 words describing a moment when someone truly heard you—not fixed you, not advised you, just heard you. How did it feel? What did they do differently?',
          isPrivate: true
        },
        check: [
          'What is the primary difference between a Peer Mentor and a licensed counsellor?',
          'Name two things that make peer support neurologically distinct from receiving professional help.',
          'A user asks you to tell them what to do about their relationship. How should you respond?',
          'What are the three foundational pillars of peer support on PeerLine?',
          'True or False: A Peer Mentor can share their own experience if it helps the user feel less alone.'
        ]
      }
    },
    {
      order: 2,
      title: 'Episode 2: Listening Without Fixing',
      slug: 'peerline-ep2-listening-without-fixing',
      description: 'Develop your active listening skills and learn to pause the instinct to fix.',
      content: {
        overview: 'The instinct to fix, advise, and solve is deeply human — and it is precisely what you must learn to pause. This episode develops your active listening skills, teaches validation techniques, and draws a clear line around unsolicited advice.',
        objectives: [
          'Apply at least five active listening techniques in a written conversation',
          'Validate a user\'s emotion without minimising or inflating it',
          'Recognise the impulse to give advice and consciously redirect it',
          'Use open questions to help a user explore their own thinking',
          'Demonstrate reflective listening through text-based paraphrasing'
        ],
        modules: [
          { id: '2.1', title: 'The Anatomy of Active Listening', detail: 'SOLER framework adapted for text: Summarise, Open questions, Label emotions, Explore gently, Reflect back.' },
          { id: '2.2', title: 'Validation — The Most Powerful Tool', detail: 'What validation is and isn\'t. The three levels of validation. How to validate without agreeing with a harmful belief.' },
          { id: '2.3', title: 'The Advice Trap', detail: 'Why giving advice feels helpful but often isn\'t. The \'advice vs. presence\' study. How to notice when you\'re about to advise and what to say instead.' },
          { id: '2.4', title: 'Unsolicited Advice — Why It Harms', detail: 'The autonomy cost of unsolicited advice. Real examples from peer support gone wrong. The one exception rule.' },
          { id: '2.5', title: 'Powerful Questions', detail: 'Open vs. closed questions. Coaching-style questions that spark self-reflection. Questions to avoid and why.' },
          { id: '2.6', title: 'Text-Based Listening', detail: 'Adapting listening skills to written conversation: pacing, emoji use, response length, silence in text, and re-reading before replying.' }
        ],
        practice: {
          title: 'Episode 2 Practice',
          prompt: 'You are given three user message scenarios. For each one, write a response that demonstrates active listening and validation without giving advice.'
        },
        check: [
          'A user says "I know it sounds stupid but I cried all morning." What is the best first response?',
          'What is the difference between sympathy and empathy in peer support?',
          'A user directly asks "What do you think I should do?" How do you respond?',
          'Name three open questions you could ask a user who says they feel stuck.',
          'Why is response length important in text-based peer conversations?'
        ]
      }
    },
    {
      order: 3,
      title: 'Episode 3: Safeguarding & Crisis Recognition',
      slug: 'peerline-ep3-safeguarding-crisis',
      description: 'Critical safety protocols for identifying crisis and escalating to experts.',
      content: {
        overview: 'This is the most critical episode in the Certification Journey. You will learn to recognise the signs that a user may be in crisis, what to do in those moments, and — crucially — when and how to escalate.',
        nonNegotiable: 'PeerLine Peer Mentors are not crisis counsellors and must never act as a substitute for emergency services.',
        objectives: [
          'Identify warning signs of emotional crisis, suicidal ideation, and self-harm',
          'Follow the PeerLine Crisis Protocol (SAFE sequence)',
          'Share crisis resources clearly and compassionately',
          'Understand mandatory reporting obligations',
          'Articulate why mentors must never replace professional help'
        ],
        modules: [
          { id: '3.1', title: 'Recognising Crisis Signs in Text', detail: 'Language patterns that signal distress, hopelessness, or risk.' },
          { id: '3.2', title: 'Suicidal Ideation — Myth vs. Reality', detail: 'Correcting dangerous myths. How to ask the question.' },
          { id: '3.3', title: 'Self-Harm Disclosures', detail: 'How to respond without panic or shaming. Staying present.' },
          { id: '3.4', title: 'The PeerLine Crisis Protocol', detail: 'The 4-step SAFE sequence: Stay, Acknowledge, Facilitate, Escalate.' },
          { id: '3.5', title: 'Escalation & Platform Reporting', detail: 'How to flag a conversation to the PeerLine Safety Team.' },
          { id: '3.6', title: 'Never Replacing Professional Help', detail: 'Legal and ethical boundaries. Resource library access.' },
          { id: '3.7', title: 'Mandatory Reporting Obligations', detail: 'Confidentiality vs. Safeguarding.' }
        ],
        safeProtocol: [
          { step: 'S — Stay', action: 'Remain present', example: 'Do not end the conversation. Keep the user talking.' },
          { step: 'A — Acknowledge', action: 'Name the feeling', example: '"It sounds like you\'re in a lot of pain right now. I\'m glad you told me."' },
          { step: 'F — Facilitate', action: 'Connect to support', example: 'Share crisis lines warmly.' },
          { step: 'E — Escalate', action: 'Flag internally', example: 'Use the Report button. Team responds in < 5 mins.' }
        ],
        check: [
          'List four language signals in a user\'s message that might indicate they are at risk.',
          'True or False: Asking a user directly if they are thinking of suicide increases the chance they will attempt it.',
          'Walk through the SAFE protocol for a user who says "I don\'t think I can go on anymore."',
          'When does a Peer Mentor\'s confidentiality obligation end?',
          'A user asks you not to report their crisis. What do you do?'
        ]
      }
    },
    {
      order: 4,
      title: 'Episode 4: Your Wellbeing as a Mentor',
      slug: 'peerline-ep4-your-wellbeing',
      description: 'Equipping you to recognise the signs of burnout and build sustainable self-care practices.',
      content: {
        overview: 'You cannot pour from an empty cup. Episode 4 is dedicated entirely to you — the mentor.',
        objectives: [
          'Define burnout, compassion fatigue, and secondary traumatic stress',
          'Identify personal early warning signs of emotional overload',
          'Apply self-care strategies specifically designed for peer supporters',
          'Use PeerLine\'s Mentor Wellbeing features',
          'Establish a personal Sustainability Plan'
        ],
        modules: [
          { id: '4.1', title: 'Understanding Secondary Trauma', detail: 'STS vs. Burnout.' },
          { id: '4.2', title: 'Recognising Your Warning Signs', detail: 'Physical, emotional, and cognitive indicators.' },
          { id: '4.3', title: 'Compassion Fatigue Prevention', detail: 'Journaling, supervision, nature, movement.' },
          { id: '4.4', title: 'Boundaries Revisited', detail: 'Ending conversations gracefully. Declining topics.' },
          { id: '4.5', title: 'PeerLine\'s Wellbeing Ecosystem', detail: 'Supervision calls, Mentor Circle, Pause feature.' },
          { id: '4.6', title: 'Your Personal Sustainability Plan', detail: 'Motivation, warning signs, self-care commitments.' }
        ],
        activity: {
          title: 'Personal Sustainability Plan',
          mandatory: true,
          fields: ['Why I want to be a Peer Mentor', 'My early warning signs', 'My self-care commitments', 'Who I will talk to if I feel overwhelmed']
        },
        check: [
          'What is the difference between burnout and secondary traumatic stress?',
          'Name three physical signs of compassion fatigue.',
          'A conversation left you unsettled. What should you do?',
          'How does the PeerLine Pause feature work?',
          'Why is peer-to-peer supervision important?'
        ]
      }
    }
  ];

  for (const ep of episodes) {
    await prisma.episode.upsert({
      where: { slug: ep.slug },
      update: {
        order: ep.order,
        title: ep.title,
        description: ep.description,
        content: ep.content as any,
      },
      create: {
        journeyId: journey.id,
        order: ep.order,
        title: ep.title,
        slug: ep.slug,
        description: ep.description,
        content: ep.content as any,
      }
    });
  }

  console.log('Comprehensive PeerLine Certification Journey Seeded Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
