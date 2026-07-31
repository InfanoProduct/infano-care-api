import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PeerLine Mentor Certification Journey...');

  const journeySlug = 'peerline-mentor-certification';

  // Check if it already exists and delete it to re-seed with updated data
  let existingJourney = await prisma.peerLineCertificationCourse.findUnique({
    where: { slug: journeySlug },
  });

  if (existingJourney) {
    console.log('Deleting existing journey to re-seed...');
    await prisma.peerLineCertificationCourse.delete({
      where: { slug: journeySlug }
    });
  }

  const journey = await prisma.peerLineCertificationCourse.create({
    data: {
      title: 'PeerLine Mentor Training',
      slug: journeySlug,
      description: 'Complete this training to become a certified PeerLine Mentor.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80',
      episodes: {
        create: [
          {
            title: 'Episode 1: What Is Peer Support?',
            slug: 'episode-1',
            description: 'This foundational episode grounds you in the science and ethics of peer mentoring.',
            thumbnailUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80',
            order: 1,
            content: {
              overview: 'This foundational episode grounds you in the science and ethics of peer mentoring. It explains what peer support actually is—and what it most certainly is not. By the end, you will be able to describe the peer mentoring model with confidence and hold boundaries that protect both you and the people you support.',
              objectives: [
                'Define peer support and distinguish it from counselling, therapy, and friendship',
                'Explain the neurological and psychological basis for why the lived-experience connection is powerful',
                'Describe the role of a Peer Mentor and its clear limits',
                'Identify the three foundational pillars of peer support: Empathy, boundaries, and hope.',
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
                prompt: 'Write 150–200 words describing a moment when someone truly heard you—not fixed you, not advised you, just heard you. How did it feel? What did they do differently? This reflection is private and not assessed; it is designed to anchor your learning in personal truth.'
              },
              check: [
                'What is the primary difference between a Peer Mentor and a licensed counsellor?',
                'Name two things that make peer support neurologically distinct from receiving professional help.',
                'A user asks you to tell them what to do about their relationship. How should you respond?',
                'What are the three foundational pillars of peer support on PeerLine?',
                'True or False: A Peer Mentor can share their own experience if it helps the user feel less alone. (Explain your answer.)'
              ]
            }
          },
          {
            title: 'Episode 2: Listening Without Fixing',
            slug: 'episode-2',
            description: 'Develops your active listening skills, teaches validation techniques, and draws a clear line around unsolicited advice.',
            thumbnailUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80',
            order: 2,
            content: {
              overview: 'This is the skill-building core of the Certification Journey. The instinct to fix, advise, and solve is deeply human — and it is precisely what you must learn to pause. This episode develops your active listening skills, teaches validation techniques, and draws a clear line around unsolicited advice.',
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
                prompt: 'You are given three user message scenarios. For each one, write a response that demonstrates active listening and validation without giving advice. There are no right or wrong words — this is assessed by a Coordinator against a rubric and returned with personalised feedback within 48 hours.',
                fields: ['Scenario 1 Response', 'Scenario 2 Response', 'Scenario 3 Response']
              },
              check: [
                'A user says \'I know it sounds stupid but I cried all morning.\' What is the best first response?',
                'What is the difference between sympathy and empathy in peer support?',
                'A user directly asks \'What do you think I should do?\' How do you respond?',
                'Name three open questions you could ask a user who says they feel stuck.',
                'Why is response length important in text-based peer conversations?'
              ]
            }
          },
          {
            title: 'Episode 3: Safeguarding & Crisis Recognition',
            slug: 'episode-3',
            description: 'Learn to recognise the signs that a user may be in crisis, what to do in those moments, and when to escalate.',
            thumbnailUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80',
            order: 3,
            content: {
              overview: 'This is the most critical episode in the Certification Journey. It is mandatory reading and must be completed with care. You will learn to recognise the signs that a user may be in crisis, what to do in those moments, and — crucially — when and how to escalate. You will also learn the firm principle that a Peer Mentor never replaces professional mental health support.',
              nonNegotiable: 'PeerLine Peer Mentors are not crisis counsellors and must never act as a substitute for emergency services. When a user\'s safety is at risk, your role is to acknowledge, stay calm, follow the protocol, and facilitate professional support — not to manage the crisis alone.',
              objectives: [
                'Identify the verbal and written warning signs of emotional crisis, suicidal ideation, and self-harm',
                'Follow the PeerLine Crisis Protocol step-by-step without panic',
                'Share crisis resources clearly and compassionately within a conversation',
                'Understand mandatory reporting obligations and when they apply',
                'Articulate why peer mentors must never replace professional help'
              ],
              modules: [
                { id: '3.1', title: 'Recognising Crisis Signs in Text', detail: 'Language patterns that signal distress, hopelessness, or risk. Direct vs. indirect signals. The difference between venting and crisis.' },
                { id: '3.2', title: 'Suicidal Ideation — Myth vs. Reality', detail: 'Correcting dangerous myths. Why asking directly about suicide does not increase risk. How to ask the question.' },
                { id: '3.3', title: 'Self-Harm Disclosures', detail: 'How to respond to a disclosure without panic or shaming. Staying present while escalating. What not to say.' },
                { id: '3.4', title: 'The PeerLine Crisis Protocol', detail: 'Exactly what to do when a user is in crisis: the 4-step SAFE sequence — Stay, Acknowledge, Facilitate, Escalate.' },
                { id: '3.5', title: 'Escalation & Platform Reporting', detail: 'How to flag a conversation to the PeerLine Safety Team. SLA commitments. What happens after you flag.' },
                { id: '3.6', title: 'Never Replacing Professional Help', detail: 'Legal and ethical boundaries. How to communicate referral warmly. Resources library access.' },
                { id: '3.7', title: 'Mandatory Reporting Obligations', detail: 'Situations where confidentiality is overridden. Safeguarding disclosures involving minors. Domestic violence indicators.' }
              ],
              safeProtocol: [
                { step: 'S — Stay', action: 'Remain present', example: 'Do not end the conversation. Keep the user talking. Acknowledge you have heard them.' },
                { step: 'A — Acknowledge', action: 'Name the feeling', example: 'It sounds like you\'re in a lot of pain right now. I\'m glad you told me.' },
                { step: 'F — Facilitate', action: 'Connect to support', example: 'Share the relevant crisis line, emergency service, or in-app Safety Team contact. Do not just send a link — explain it warmly.' },
                { step: 'E — Escalate', action: 'Flag internally', example: 'Use the in-app Report button to notify the PeerLine Safety Team immediately. They respond within 5 minutes during operating hours.' }
              ],
              activity: {
                title: 'Episode 3 Reflection',
                prompt: 'Reflect on how you would feel managing a crisis situation and how you plan to stay calm.',
              },
              check: [
                'List four language signals in a user\'s message that might indicate they are at risk.',
                'True or False: Asking a user directly if they are thinking of suicide increases the chance they will attempt it.',
                'Walk through the SAFE protocol for a user who says \'I don\'t think I can go on anymore.\'',
                'When does a Peer Mentor\'s confidentiality obligation end?',
                'A user asks you not to report their crisis. What do you do?'
              ]
            }
          },
          {
            title: 'Episode 4: Your Wellbeing as a Mentor',
            slug: 'episode-4',
            description: 'Recognise the signs of burnout, build sustainable self-care practices, and access wellbeing support.',
            thumbnailUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80',
            order: 4,
            content: {
              overview: 'You cannot pour from an empty cup. Episode 4 is dedicated entirely to you — the mentor. Holding space for others\' pain is meaningful work, but it comes with a cost. This episode equips you to recognise the signs of burnout and secondary traumatic stress, build sustainable self-care practices, and access PeerLine\'s built-in wellbeing support.',
              objectives: [
                'Define and distinguish mentor burnout, compassion fatigue, and secondary traumatic stress',
                'Identify your personal early warning signs of emotional overload',
                'Apply at least three self-care strategies specifically designed for peer supporters',
                'Use PeerLine\'s Mentor Wellbeing features (supervision, peer circles, pause function)',
                'Establish a personal Sustainability Plan before going live'
              ],
              modules: [
                { id: '4.1', title: 'Understanding Secondary Trauma', detail: 'What secondary traumatic stress (STS) is, why it differs from burnout, and how peer support work specifically creates STS risk.' },
                { id: '4.2', title: 'Recognising Your Warning Signs', detail: 'A personal checklist of physical, emotional, cognitive, and behavioural indicators that you are approaching your limit.' },
                { id: '4.3', title: 'Compassion Fatigue Prevention', detail: 'Evidence-based strategies: structured decompression after sessions, journaling, supervision, nature, movement, social connection.' },
                { id: '4.4', title: 'Boundaries Revisited', detail: 'How to end a conversation gracefully. How to decline a topic that is too close to your own unresolved experience.' },
                { id: '4.5', title: 'PeerLine\'s Wellbeing Ecosystem', detail: 'Monthly group supervision calls, the Mentor Circle (private peer-to-peer space), the Pause feature, and access to a professional counsellor for mentors.' },
                { id: '4.6', title: 'Your Personal Sustainability Plan', detail: 'A guided template to complete before going live: your motivation, your warning signs, your self-care commitments, your support contacts.' }
              ],
              activity: {
                title: 'Sustainability Plan Activity',
                prompt: 'Before your account goes live, you must submit a completed Personal Sustainability Plan. This is not assessed for quality — it is a commitment to yourself.',
                fields: [
                  '1. Why I want to be a Peer Mentor',
                  '2. My early warning signs',
                  '3. My self-care commitments',
                  '4. Who I will talk to if I feel overwhelmed'
                ]
              },
              check: [
                'What is the difference between burnout and secondary traumatic stress?',
                'Name three physical signs that you may be approaching compassion fatigue.',
                'A conversation left you feeling deeply unsettled. What should you do in the next 30 minutes?',
                'How does the PeerLine Pause feature work, and when should you use it?',
                'Why is peer-to-peer supervision (the Mentor Circle) important even after certification?'
              ]
            }
          }
        ]
      }
    }
  });
  console.log(`Created journey: ${journey.title}`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
