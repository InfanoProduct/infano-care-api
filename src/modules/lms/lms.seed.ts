/**
 * Seed script for Core Platform Video Courses (Module 1 to Module 6).
 * Fully populated with comprehensive facts (goodToKnowPoints), FAQs, and End-of-Module Quiz Assessments.
 *
 * Run via: npx tsx --env-file=.env src/modules/lms/lms.seed.ts
 * or: npm run seed:lms
 */

import { prisma } from "../../db/client.js";

const SINGLE_MASTER_COURSE = {
  title: "Infano Core Platform: Adolescent & Parenting Masterclass",
  description:
    "A masterclass 6-module video curriculum covering Foundational Growth, Emotional & Behavioral Dynamics, Adolescent Resilience, Communication, Mind & Physical Health, and Future Pathways. Includes in-depth video lessons, scientific facts, FAQs, and module assessments.",
  timeDuration: 345, // 19 videos + 6 quizzes
  price: 999,
  isFree: false,
  isActive: true,
  thumbnailUrl: "https://infano-prod.duckdns.org/images/CourseImageM1.png",
  category: "Parenting",
  highlights: [
    "Complete 6-module roadmap for adolescent development and parenting",
    "Evidence-based strategies for emotional regulation, mood swings, and resilience",
    "Actionable communication frameworks for trust, boundaries, and conflict resolution",
    "Holistic physical, nutritional, and mental wellness routines for growing teens",
    "Empowerment, decision making, and future goal-setting principles",
    "End-of-module assessment quizzes to track and validate learner mastery",
  ],
  modules: [
    {
      title: "Module 1: Foundational Growth",
      description:
        "Understanding physical, hormonal, and cognitive growth milestones during early and mid-adolescence.",
      timeDuration: 55,
      thumbnailUrl: "https://infano-prod.duckdns.org/images/Module1.png",
      order: 1,
      chapters: [
        {
          title: "Foundations of Growth - Part 1 (M1C1)",
          description:
            "Biological foundations, growth velocity charts, and physical changes during puberty.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM1C1.png",
          type: "VIDEO" as const,
          order: 1,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m1c1/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Adolescent growth spurts account for up to 20% of adult height and 50% of adult bone mass.",
            "Growth in extremities (feet and hands) typically precedes axial growth in the torso and limbs.",
            "Adequate daily intake of Calcium (1300mg) and Vitamin D is crucial during peak bone-mineral accretion.",
            "Energy demands increase sharply: active teenagers often require 2,400 to 3,000+ kcal daily.",
          ],
          faqs: [
            {
              question: "Why do growth rates vary so widely among classmates of the exact same age?",
              answer:
                "Pubertal timing is governed primarily by genetics, nutrition, and endocrine triggers. Entering puberty earlier or later is completely normal and healthy.",
            },
            {
              question: "What should we do if our teen experiences frequent 'growing pains'?",
              answer:
                "Mild aching in the legs in the evening is common during growth spurts. Gentle stretching, warm baths, and adequate hydration help. Persistent or joint-specific pain should be evaluated by a pediatrician.",
            },
            {
              question: "How does physical growth influence athletic coordination?",
              answer:
                "Rapid limb lengthening temporarily alters the body's center of gravity, causing transient clumsiness or changes in athletic performance until proprioception catches up.",
            },
          ],
        },
        {
          title: "Foundations of Growth - Part 2 (M1C2)",
          description:
            "Neurological remodeling, synaptic pruning, and the maturation of the prefrontal cortex.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM1C2.png",
          type: "VIDEO" as const,
          order: 2,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m1c2/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "The brain undergoes massive synaptic pruning during adolescence, shedding unused neural pathways to maximize speed.",
            "Myelination increases neural signal transmission speed by up to 100x along high-use cognitive circuits.",
            "The prefrontal cortex—responsible for consequence forecasting and self-control—matures last (around age 25).",
            "The adolescent brain is hyper-plastic and exceptionally primed for mastering complex skills, music, and languages.",
          ],
          faqs: [
            {
              question: "Why do teens sometimes make impulsive choices despite knowing the rules?",
              answer:
                "The limbic system (emotional reward center) matures faster than the rational prefrontal cortex, causing reward-seeking to temporarily outweigh risk calculation in high-arousal situations.",
            },
            {
              question: "How can parents effectively support executive function development?",
              answer:
                "Provide visual calendars, predictable daily routines, break complex assignments into micro-tasks, and model deliberate problem-solving out loud.",
            },
            {
              question: "Does screen time impact brain remodeling?",
              answer:
                "Excessive late-night screen time disrupts circadian melatonin secretion and deep slow-wave sleep, which is required for neural consolidation and emotional reset.",
            },
          ],
        },
        {
          title: "Foundations of Growth - Part 3 (M1C3)",
          description:
            "Self-concept, identity formation, and establishing healthy developmental autonomy.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM1C3.png",
          type: "VIDEO" as const,
          order: 3,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m1c3/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Individuation is a primary developmental milestone: adolescents must figure out who they are separate from their parents.",
            "Pushing for independence is a healthy biological drive rather than personal animosity towards parents.",
            "Teens who feel accepted unconditionally at home explore new interests with greater resilience and less anxiety.",
            "Peer comparison peaks during early adolescence as social identity circuits undergo intense calibration.",
          ],
          faqs: [
            {
              question: "How do we balance granting healthy autonomy while maintaining safety?",
              answer:
                "Use the 'freedom with responsibility' principle: grant privileges incrementally as agreements are consistently met, while keeping firm baseline safety guardrails.",
            },
            {
              question: "What if my teen frequently changes their style, hobbies, or friend groups?",
              answer:
                "Identity experimentation is a normal exploration phase. Encourage safe exploration while offering a steady, unconditional anchor of support.",
            },
            {
              question: "How do I avoid sounding overly critical when asking about their day?",
              answer:
                "Replace interrogative 'Why did you...' questions with curiosity-based inquiries like 'What was the highlight of your day?' or 'How did that feel for you?'",
            },
          ],
        },
        {
          title: "Module 1 Mastery Quiz: Foundational Growth",
          description: "Test your understanding of adolescent physical and cognitive development.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM1C3.png",
          type: "ASSESSMENT" as const,
          order: 4,
          assessment: {
            passingScore: 80,
            questions: [
              {
                question: "Around what age does the human prefrontal cortex finish its full neurological maturation?",
                options: ["Around age 14", "Around age 18", "Around age 25", "Around age 35"],
                correctOptionIndex: 2,
                explanation:
                  "Neuroimaging studies show the prefrontal cortex continues structural remodeling and myelination through the mid-twenties.",
              },
              {
                question: "What is the primary biological purpose of synaptic pruning during adolescence?",
                options: [
                  "To slow down overall brain activity to conserve energy",
                  "To eliminate unused neural connections and optimize high-use circuits for speed and efficiency",
                  "To permanently erase childhood memories",
                  "To replace gray matter with muscle fibers",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Synaptic pruning streamlines brain circuitry, reinforcing frequently practiced skills and behaviors while shedding unused pathways.",
              },
              {
                question: "Why do adolescents experience temporary clumsiness during growth spurts?",
                options: [
                  "Because their muscles lose strength during puberty",
                  "Because limbs and extremities grow first, shifting the body's center of gravity faster than motor circuits recalibrate",
                  "Due to lack of calcium in the bones",
                  "Because sleep deprivation prevents muscle contraction",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Rapid asynchronous limb growth temporarily disrupts center of gravity and spatial proprioception until the brain recalibrates.",
              },
            ],
          },
        },
      ],
    },
    {
      title: "Module 2: Emotional & Behavioral Dynamics",
      description:
        "Navigating emotional surges, mood regulation, impulsivity, and behavioral dynamics.",
      timeDuration: 70,
      thumbnailUrl: "https://infano-prod.duckdns.org/images/Module2.png",
      order: 2,
      chapters: [
        {
          title: "Emotional Dynamics - Part 1 (M2C1)",
          description:
            "Decoding the adolescent emotional landscape and understanding amygdala-driven reactions.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM2C1.png",
          type: "VIDEO" as const,
          order: 1,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m2c1/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "The amygdala reacts rapidly to perceived social slights or threats, triggering instant emotional arousal.",
            "Teens frequently misinterpret neutral facial expressions or calm questions as hostile or judgmental.",
            "Emotional flooding temporarily inhibits rational thinking, making lecture-style debates counterproductive during conflict.",
            "A calm parental presence acts as an external co-regulator for an emotionally overwhelmed teen.",
          ],
          faqs: [
            {
              question: "What is the single best first response when a teen has an emotional outburst?",
              answer:
                "Stay completely calm, lower your vocal pitch, and provide physical space. Never match their intensity or try to debate logic during high emotional flooding.",
            },
            {
              question: "How long does it typically take for the nervous system to reset after an outburst?",
              answer:
                "It takes approximately 20 to 30 minutes for stress hormones (cortisol and adrenaline) to clear the bloodstream once calm is restored.",
            },
            {
              question: "Does validating their emotion mean agreeing with unacceptable behavior?",
              answer:
                "No. Validation acknowledges the genuine feeling ('I see how upset you are') while consequences address the behavior ('Throwing things is never acceptable').",
            },
          ],
        },
        {
          title: "Emotional Dynamics - Part 2 (M2C2)",
          description:
            "Healthy emotional expression, frustration tolerance, and self-soothing mechanisms.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM2C2.png",
          type: "VIDEO" as const,
          order: 2,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m2c2/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Naming specific emotions ('disappointed', 'embarrassed', 'overwhelmed') dampens amygdala hyperactivity.",
            "Physical exertion (brisk walking, swimming, boxing) metabolizes built-up adrenaline rapidly.",
            "Guided somatic breathing stimulates the vagus nerve and activates the calming parasympathetic system.",
            "Repressing emotions increases baseline somatic anxiety and physical fatigue over time.",
          ],
          faqs: [
            {
              question: "How can I teach my teen self-soothing techniques without sounding patronizing?",
              answer:
                "Introduce techniques during calm, low-stress moments rather than during a heated crisis, or model the practices in your own daily routines.",
            },
            {
              question: "What is the 5-4-3-2-1 grounding technique?",
              answer:
                "A sensory reset: identify 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste to bring focus back to the present.",
            },
            {
              question: "Are mood tracking apps helpful for teens?",
              answer:
                "Yes, tracking moods helps identify environmental triggers (like poor sleep or skipped meals) and fosters self-awareness.",
            },
          ],
        },
        {
          title: "Behavioral Patterns - Part 3 (M2C3)",
          description:
            "Identifying positive vs. challenging behavioral patterns and boundary pushback.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM2C3.png",
          type: "VIDEO" as const,
          order: 3,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m2c3/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Testing household boundaries is a natural way teens measure stability and parental reliability.",
            "Clear, consistent, predictable boundaries reduce teen anxiety because they define expectations clearly.",
            "Arbitrary or unpredictable punishments increase resentment and secretive behaviors.",
            "Co-creating household agreements increases voluntary compliance by up to 70%.",
          ],
          faqs: [
            {
              question: "How do we handle broken agreements around curfew or device use?",
              answer:
                "Implement logical, pre-established consequences (e.g. earlier curfew next time) calmly, without anger or shame.",
            },
            {
              question: "What is the difference between healthy risk-taking and dangerous behavior?",
              answer:
                "Healthy risk-taking includes trying out for a team, learning a performance art, or meeting new people; dangerous risk-taking involves substance abuse or reckless driving.",
            },
            {
              question: "Why do teens often show better behavior with strangers than at home?",
              answer:
                "Home is their psychological safe zone where they can drop social masks and discharge accumulated daily stress.",
            },
          ],
        },
        {
          title: "Behavioral Patterns - Part 4 (M2C4)",
          description:
            "Fostering personal accountability, ownership of mistakes, and reparative actions.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM2C4.png",
          type: "VIDEO" as const,
          order: 4,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m2c4/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Accountability focuses on repairing harm done; punishment focuses purely on imposing suffering.",
            "Encouraging restorative actions ('How can you make this right with your sibling?') builds moral empathy.",
            "Parents who readily apologize for their own missteps model authenticity and accountability.",
            "Shame causes withdrawal and deceit, whereas constructive guilt motivates positive behavioral change.",
          ],
          faqs: [
            {
              question: "What if a teen lies to avoid getting into trouble?",
              answer:
                "Reward honesty when they do admit a mistake, and calmly explore the fear that prompted the dishonesty without explosive reactions.",
            },
            {
              question: "How do we transition from external discipline to self-discipline?",
              answer:
                "Ask guiding questions: 'What do you think is a fair solution here?' allowing them to practice moral reasoning.",
            },
            {
              question: "Should privileges be taken away indefinitely?",
              answer:
                "No. Indefinite punishments create hopelessness. Keep consequences short, clear, and tied to earning back trust.",
            },
          ],
        },
        {
          title: "Module 2 Mastery Quiz: Emotional & Behavioral Dynamics",
          description: "Assess your understanding of adolescent emotional regulation and boundaries.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM2C4.png",
          type: "ASSESSMENT" as const,
          order: 5,
          assessment: {
            passingScore: 80,
            questions: [
              {
                question: "What happens in the brain when a teenager experiences emotional flooding during an argument?",
                options: [
                  "Their prefrontal cortex sharpens and enables deep logical reasoning",
                  "The amygdala takes over, temporarily impairing rational logic and consequence evaluation",
                  "Their brain temporarily stops releasing cortisol",
                  "Their hearing improves significantly",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Emotional flooding triggers acute stress reactions in the amygdala, making logical debate ineffective until cool-down occurs.",
              },
              {
                question: "Which approach is most effective when establishing household boundaries with adolescents?",
                options: [
                  "Imposing strict, arbitrary rules without any explanation",
                  "Co-creating clear agreements and logical consequences collaboratively with the teen",
                  "Having no rules or boundaries to avoid any potential conflict",
                  "Changing rules daily depending on the parent's mood",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Co-created boundaries foster ownership, mutual trust, and significantly higher adherence.",
              },
              {
                question: "What is the primary difference between restorative accountability and punitive discipline?",
                options: [
                  "Accountability focuses on repairing relational harm and learning, whereas punishment focuses on imposing distress",
                  "Accountability is always harsher and lasts much longer",
                  "Punishment requires no parental involvement",
                  "There is no difference between the two",
                ],
                correctOptionIndex: 0,
                explanation:
                  "Restorative accountability builds internal conscience and empathy by focusing on fixing what was broken.",
              },
            ],
          },
        },
      ],
    },
    {
      title: "Module 3: Adolescent Resilience",
      description:
        "Building psychological fortitude, handling setbacks, overcoming academic pressure, and developing grit.",
      timeDuration: 55,
      thumbnailUrl: "https://infano-prod.duckdns.org/images/Module3.png",
      order: 3,
      chapters: [
        {
          title: "Building Resilience - Part 1 (M3C1)",
          description:
            "The science of psychological resilience: developing growth mindsets in the face of setbacks.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM3C1.png",
          type: "VIDEO" as const,
          order: 1,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m3c1/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Resilience is not the absence of stress, but the learned capacity to adapt and recover from adversity.",
            "Praising effort, strategy, and perseverance fosters a growth mindset far more than praising innate intelligence.",
            "Experiencing small, manageable failures with supportive guidance inoculates teens against adult catastrophe anxiety.",
            "Resilient teenagers have at least one adult in their life who provides unconditional positive regard.",
          ],
          faqs: [
            {
              question: "How can I prevent overprotecting ('snowplow parenting') my teen?",
              answer:
                "Resist stepping in immediately to solve everyday minor problems. Let them navigate uncomfortable situations while offering moral support from the sidelines.",
            },
            {
              question: "What is the 'Power of Yet' framework?",
              answer:
                "Reframing 'I can't do this' into 'I can't do this *yet*' reminds the brain that capability is malleable through practice.",
            },
            {
              question: "How does resilience impact academic performance?",
              answer:
                "Resilient students treat low test scores as diagnostic feedback rather than evidence of fixed personal incompetence.",
            },
          ],
        },
        {
          title: "Stress & Coping - Part 2 (M3C2)",
          description:
            "Evidence-based somatic and cognitive coping strategies for academic and social stress.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM3C2.png",
          type: "VIDEO" as const,
          order: 2,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m3c2/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Acute exam stress causes vasoconstriction and shallow breathing, reducing oxygen supply to brain centers.",
            "The 4-7-8 and box-breathing techniques trigger rapid parasympathetic downregulation within 90 seconds.",
            "Physical breaks every 45-50 minutes of studying restore cognitive focus and enhance memory retention.",
            "Chronic sleep deprivation impairs emotional resilience by over 40% in adolescents.",
          ],
          faqs: [
            {
              question: "What are early physical warning signs of burnout in students?",
              answer:
                "Frequent tension headaches, digestive issues, sudden loss of interest in hobbies, irritability, and altered sleep patterns.",
            },
            {
              question: "How can teens manage acute panic before big exams?",
              answer:
                "Practice 3 deep physiological sighs (double inhale through nose, long exhale through mouth) to quickly reset resting heart rate.",
            },
            {
              question: "Does caffeine worsen anxiety in teenagers?",
              answer:
                "Yes. High caffeine doses mimic adrenaline rushes, heightening jitteriness, palpitations, and sleep disruption.",
            },
          ],
        },
        {
          title: "Mindset & Growth - Part 3 (M3C3)",
          description:
            "Reframing negative self-talk, overcoming perfectionism, and cultivating self-compassion.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM3C3.png",
          type: "VIDEO" as const,
          order: 3,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m3c3/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Perfectionism is rooted in fear of judgment, whereas healthy striving is fueled by curiosity and self-growth.",
            "Self-compassion entails treating oneself with the same kindness one would extend to a close friend in distress.",
            "Cognitive reframing identifies all-or-nothing cognitive distortions ('I ruined everything') and replaces them with balanced realities.",
            "Optimism is a trainable mental habit: focusing on factors within one's control fosters proactive agency.",
          ],
          faqs: [
            {
              question: "How do I help a teen who gets paralyzed by perfectionism?",
              answer:
                "Celebrate 'good enough' milestones, set time limits on assignments, and openly discuss your own mistakes and how you handled them.",
            },
            {
              question: "What is cognitive reframing?",
              answer:
                "It is the conscious process of challenging irrational negative thoughts with objective, evidence-based perspectives.",
            },
            {
              question: "How does social media amplify perfectionism?",
              answer:
                "Social media displays curated highlight reels; educating teens on digital literacy and algorithm design counters unrealistic comparison.",
            },
          ],
        },
        {
          title: "Module 3 Mastery Quiz: Adolescent Resilience & Stress Coping",
          description: "Test your mastery of growth mindsets, stress regulation, and self-compassion.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM3C3.png",
          type: "ASSESSMENT" as const,
          order: 4,
          assessment: {
            passingScore: 80,
            questions: [
              {
                question: "According to growth mindset research, which type of praise best fosters long-term resilience?",
                options: [
                  "Praising innate genius ('You are a natural prodigy at math!')",
                  "Praising effort, persistence, and strategic adjustments ('I love the creative strategy and dedication you put into solving that!')",
                  "Praising effortless speed ('You finished that so quickly without trying!')",
                  "Giving no feedback at all",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Effort praise reinforces that ability is malleable and encourages persistence through challenging obstacles.",
              },
              {
                question: "How does deliberate deep breathing with extended exhalations affect the nervous system?",
                options: [
                  "It stimulates the vagus nerve and activates the parasympathetic (calming) system",
                  "It spikes adrenaline and elevates heart rate immediately",
                  "It causes hyperventilation",
                  "It has no biological effect",
                ],
                correctOptionIndex: 0,
                explanation:
                  "Extended exhalations trigger the vagal response, reducing resting heart rate and blood pressure.",
              },
              {
                question: "What is the core difference between perfectionism and healthy striving?",
                options: [
                  "Perfectionism is motivated by fear of judgment and failure; healthy striving is motivated by curiosity and mastery",
                  "Perfectionism produces much happier individuals",
                  "Healthy striving never makes any mistakes",
                  "They are identical concepts",
                ],
                correctOptionIndex: 0,
                explanation:
                  "Perfectionism ties self-worth strictly to flawlessness, whereas healthy striving values continuous learning.",
              },
            ],
          },
        },
      ],
    },
    {
      title: "Module 4: Communication & Relationships",
      description:
        "Cultivating active listening, conflict de-escalation, peer dynamics, and healthy digital boundaries.",
      timeDuration: 85,
      thumbnailUrl: "https://infano-prod.duckdns.org/images/Module4.png",
      order: 4,
      chapters: [
        {
          title: "Communication Foundations (M4C1)",
          description:
            "Core principles of open, non-defensive parent-teen dialogue and mutual respect.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM4C1.png",
          type: "VIDEO" as const,
          order: 1,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m4c1/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Side-by-side conversations (during walks, drives, cooking) reduce face-to-face intensity and unlock candid sharing.",
            "Starting conversations with unsolicited advice immediately raises defensive cognitive barriers in teens.",
            "Brief 10-minute daily check-ins build stronger communication bridges than rare, high-pressure marathon interrogations.",
            "Body language, tone of voice, and facial warmth communicate more safety than literal spoken words.",
          ],
          faqs: [
            {
              question: "How do I start a conversation when my teen gives only one-word answers?",
              answer:
                "Avoid yes/no questions. Share something interesting or funny from your own day first to normalize open sharing without pressure.",
            },
            {
              question: "When is the worst time to initiate a serious discussion?",
              answer:
                "Right when they walk through the door after school, right before bedtime, or when either party is hungry or tired ('HALT' rule).",
            },
            {
              question: "What is the 'Ask, Don't Tell' technique?",
              answer:
                "Instead of dictating solutions ('You must study now'), ask guided questions ('What's your plan for preparing for tomorrow's chemistry test?').",
            },
          ],
        },
        {
          title: "Active Listening & Empathy (M4C2)",
          description:
            "Reflective listening techniques, validating emotional realities, and reducing defensiveness.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM4C2.png",
          type: "VIDEO" as const,
          order: 2,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m4c2/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Reflective statements like 'It sounds like you felt really dismissed by your friend' prove genuine attunement.",
            "Ask the golden triage question: 'Do you want to vent, do you want advice, or do you want a hug?'",
            "Silence and patient pauses give the adolescent brain time to articulate complex emotional states.",
            "Minimizing their concerns ('Don't worry, high school doesn't matter later') makes them feel unheard and isolated.",
          ],
          faqs: [
            {
              question: "How do I validate feelings without agreeing with an exaggerated statement?",
              answer:
                "Validate the emotion ('I hear how overwhelming that feels') without validating factually incorrect conclusions.",
            },
            {
              question: "What should I do if I find myself interrupting?",
              answer:
                "Pause immediately, apologize: 'I interrupted you, please continue,' which reinforces deep respect for their voice.",
            },
            {
              question: "Why is active listening so challenging for parents?",
              answer:
                "Parents have a strong natural instinct to fix problems and alleviate their child's pain immediately, which often short-circuits listening.",
            },
          ],
        },
        {
          title: "Conflict De-escalation (M4C3)",
          description:
            "De-escalating heated household arguments and turning conflict into connection.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM4C3.png",
          type: "VIDEO" as const,
          order: 3,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m4c3/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Winning an argument at the cost of damaging the relationship is a net loss in adolescent parenting.",
            "Agree on a 'cool-down signal' before conflicts happen so either person can call a 15-minute pause without guilt.",
            "Lowering your vocal volume and slowing speech cadence naturally forces the other person to match your rhythm.",
            "Focus on 'I feel...' statements rather than accusatory 'You always...' or 'You never...' generalizations.",
          ],
          faqs: [
            {
              question: "What should I do if my teen slams their bedroom door during an argument?",
              answer:
                "Let the door stay closed for 20 minutes to allow adrenaline to subside. Revisit calmly once emotions are stabilized.",
            },
            {
              question: "How do we resolve recurring arguments about screen time?",
              answer:
                "Hold a neutral family meeting to establish clear, automated guidelines (e.g. WiFi cutoffs at 10 PM) so arguments aren't personal daily battles.",
            },
            {
              question: "What is the 24-hour rule in conflict?",
              answer:
                "For non-urgent conflicts, agree to sleep on the issue and discuss proposed solutions the following evening with fresh minds.",
            },
          ],
        },
        {
          title: "Peer Relationships & Boundaries (M4C4)",
          description:
            "Navigating friendships, peer pressure, digital communication, and social belonging.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM4C4.png",
          type: "VIDEO" as const,
          order: 4,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m4c4/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Peer approval triggers high dopamine spikes in the adolescent brain, making peer belonging feel vital to survival.",
            "Equip teens with realistic 'X-plan' or coded exit text messages to leave unsafe parties without social embarrassment.",
            "Digital FOMO (Fear of Missing Out) fuels late-night messaging and anxiety if boundaries aren't established.",
            "Teaching teens to say 'No' assertively without over-apologizing protects them from peer exploitation.",
          ],
          faqs: [
            {
              question: "How can I guide my teen away from unhealthy friends without provoking rebellion?",
              answer:
                "Focus on behaviors rather than attacking their friends' character: 'I notice you seem anxious after hanging out with X; how do you feel about it?'",
            },
            {
              question: "What is the 'X-plan' text strategy?",
              answer:
                "The teen texts a pre-agreed letter (like 'X') to a parent, and the parent immediately calls with a mandatory excuse to pick them up.",
            },
            {
              question: "How can parents manage group chat drama?",
              answer:
                "Encourage face-to-face or voice resolution, as text lacks vocal tone and facial nuance, multiplying misunderstandings tenfold.",
            },
          ],
        },
        {
          title: "Family Dynamics & Trust (M4C5)",
          description:
            "Rebuilding damaged trust, establishing family rituals, and sustaining lifelong bonds.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM4C5.png",
          type: "VIDEO" as const,
          order: 5,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m4c5/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Trust is like a bank account: small daily reliable acts deposit trust, while broken promises make heavy withdrawals.",
            "Consistent family traditions (Sunday breakfast, game nights, annual trips) anchor a teen's sense of belonging.",
            "Adolescents need to know they can come to parents with any crisis without the fear of explosive retaliation.",
            "Rebuilding broken trust is a gradual process that requires clear metrics rather than vague promises.",
          ],
          faqs: [
            {
              question: "How can a parent rebuild trust if they previously reacted with extreme anger?",
              answer:
                "Offer a genuine, heartfelt apology without excuses, take accountability, and demonstrate consistent calm behavior over time.",
            },
            {
              question: "Why are family meals together so statistically protective?",
              answer:
                "Regular family meals are correlated with lower rates of depression, higher academic achievement, and stronger emotional openness.",
            },
            {
              question: "How should parents handle sibling rivalry in teenage years?",
              answer:
                "Avoid comparing siblings' academic or athletic achievements; celebrate each individual's unique path and strengths.",
            },
          ],
        },
        {
          title: "Module 4 Mastery Quiz: Communication & Relationship Dynamics",
          description: "Assess your mastery of active listening, de-escalation, and family trust building.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM4C5.png",
          type: "ASSESSMENT" as const,
          order: 6,
          assessment: {
            passingScore: 80,
            questions: [
              {
                question: "Which conversation setting is often most effective for eliciting open sharing from teenagers?",
                options: [
                  "A formal, high-stakes interrogation across a desk",
                  "Side-by-side informal activities (like riding in the car or cooking) with reduced eye-contact pressure",
                  "Surprising them in front of all their peers",
                  "Leaving critical notes under their bedroom door",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Side-by-side environments minimize perceived interrogation intensity and enable more relaxed, genuine conversation.",
              },
              {
                question: "What is the recommended question to ask when a teen approaches you with a major emotional frustration?",
                options: [
                  "Why didn't you handle that better?",
                  "Do you want to vent, do you want advice, or do you want a hug?",
                  "Are you sure you aren't overreacting?",
                  "Why are you telling me this now?",
                ],
                correctOptionIndex: 1,
                explanation:
                  "This triages their immediate emotional need and prevents unwanted, unsolicited advice before they feel heard.",
              },
              {
                question: "What is the primary function of the 'X-plan' text strategy between teens and parents?",
                options: [
                  "To track the teen's GPS coordinates secretly",
                  "To give the teen a discreet, blameless exit mechanism from unsafe social situations without peer embarrassment",
                  "To cancel household chores",
                  "To demand immediate allowance transfers",
                ],
                correctOptionIndex: 1,
                explanation:
                  "The X-plan gives teenagers an immediate parental excuse to leave uncomfortable situations with their social dignity intact.",
              },
            ],
          },
        },
      ],
    },
    {
      title: "Module 5: Mind & Physical Health",
      description:
        "Harmonizing mental wellness, restorative sleep hygiene, balanced adolescent nutrition, and physical vitality.",
      timeDuration: 55,
      thumbnailUrl: "https://infano-prod.duckdns.org/images/Module5.png",
      order: 5,
      chapters: [
        {
          title: "Physical Wellbeing & Growth (M5C1)",
          description:
            "Physical changes, exercise benefits, posture, and active lifestyles for adolescents.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM5C1.png",
          type: "VIDEO" as const,
          order: 1,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m5c1/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "At least 60 minutes of moderate-to-vigorous daily movement promotes neurogenesis and boosts endorphins.",
            "Strength training with proper form is completely safe for adolescents and increases bone mineral density.",
            "Sedentary posture from long screen sessions tightens hip flexors and rounds cervical vertebrae.",
            "Physical stamina directly correlates with cognitive stamina during long exams and study sessions.",
          ],
          faqs: [
            {
              question: "Is resistance/weight training safe for growing teenagers?",
              answer:
                "Yes. Evidence-based pediatric sports science confirms age-appropriate resistance training with proper form strengthens tendons and bones without stunting growth.",
            },
            {
              question: "How can parents encourage inactive teens to move more?",
              answer:
                "Find joyful, non-competitive movement like dance, skateboarding, swimming, hiking, martial arts, or rock climbing.",
            },
            {
              question: "How does exercise impact teenage anxiety and depression?",
              answer:
                "Regular aerobic exercise stimulates Brain-Derived Neurotrophic Factor (BDNF) and balances neurotransmitters (Serotonin, Dopamine) as effectively as mild therapy.",
            },
          ],
        },
        {
          title: "Mind-Body Connection & Sleep (M5C2)",
          description:
            "Adolescent circadian rhythm shifts, blue light impact, and restorative sleep hygiene.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM5C2.png",
          type: "VIDEO" as const,
          order: 2,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m5c2/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Melatonin secretion in adolescents naturally occurs ~2 hours later than in adults, making 11 PM feel like 9 PM.",
            "Teenagers require 8 to 10 hours of sleep nightly for optimal cognitive function, memory consolidation, and growth.",
            "Blue light emitted by smartphones suppresses melatonin release, delaying sleep onset by up to 90 minutes.",
            "Consistent wake times on weekends (within 1 hour of weekdays) prevent 'social jetlag' on Monday mornings.",
          ],
          faqs: [
            {
              question: "Why can't teens just catch up on all their sleep over the weekend?",
              answer:
                "Sleeping in 4+ hours late on weekends shifts the internal biological clock, creating severe insomnia on Sunday night and fatigue all week.",
            },
            {
              question: "What is the single most effective sleep rule for households?",
              answer:
                "Establishing a central charging station in the kitchen or living room so devices do not enter bedrooms overnight.",
            },
            {
              question: "How does sleep deprivation influence mood and emotion regulation?",
              answer:
                "A sleep-deprived brain shows a 60% increase in amygdala reactivity, making teens significantly more irritable, anxious, and prone to tears.",
            },
          ],
        },
        {
          title: "Nutrition & Daily Habits (M5C3)",
          description:
            "Balanced meal planning, micronutrient essentials (Iron, Calcium, Zinc), and positive body image.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM5C3.png",
          type: "VIDEO" as const,
          order: 3,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m5c3/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Adolescents have peak lifetime requirements for Iron (especially menstruating teens) and Calcium (bone growth).",
            "Skipping breakfast causes mid-morning blood sugar crashes, brain fog, and intense sugar cravings later in the day.",
            "Hydration directly impacts memory retrieval: even a 2% dehydration level reduces attention span.",
            "Fostering body positivity involves focusing on what the body can do rather than how it looks.",
          ],
          faqs: [
            {
              question: "How do we handle a teen who refuses to eat breakfast before school?",
              answer:
                "Offer quick, portable nutrient-dense options like a smoothie with Greek yogurt and banana, a hard-boiled egg, or nut butter on whole-grain toast.",
            },
            {
              question: "What are red flags for disordered eating in adolescents?",
              answer:
                "Obsessive calorie counting, skipping meals with excuses, sudden elimination of entire food groups, eating in secret, or excessive exercise following meals.",
            },
            {
              question: "How should parents talk about nutrition without triggering body image issues?",
              answer:
                "Frame food as fuel for energy, focus, and athletic strength, rather than using labels like 'fattening', 'good', or 'bad'.",
            },
          ],
        },
        {
          title: "Module 5 Mastery Quiz: Mind, Body & Nutrition",
          description: "Test your understanding of adolescent sleep science, physical activity, and nutrition.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM5C3.png",
          type: "ASSESSMENT" as const,
          order: 4,
          assessment: {
            passingScore: 80,
            questions: [
              {
                question: "Why do adolescents biologically struggle to fall asleep before 10:30 PM - 11:00 PM?",
                options: [
                  "Because their melatonin secretion naturally shifts approximately two hours later during puberty",
                  "Because their bodies stop needing sleep during puberty",
                  "Because their muscles refuse to relax until midnight",
                  "Because they are just stubborn",
                ],
                correctOptionIndex: 0,
                explanation:
                  "Pubertal endocrine shifts delay circadian melatonin onset by approximately two hours, known as the adolescent circadian phase delay.",
              },
              {
                question: "How many hours of sleep per night do medical and sleep organizations recommend for adolescents?",
                options: ["4 to 6 hours", "8 to 10 hours", "12 to 14 hours", "6 hours with multiple naps"],
                correctOptionIndex: 1,
                explanation:
                  "8 to 10 hours of restorative sleep is critical for neurological consolidation, emotional health, and physical growth.",
              },
              {
                question: "What is the most constructive way to discuss food and nutrition with teenagers?",
                options: [
                  "Criticizing their weight and measuring their waistline",
                  "Focusing on food as vitality and fuel for energy, athletic performance, and brain focus",
                  "Banning all carbohydrates completely",
                  "Comparing their eating habits to their siblings",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Framing nutrition around vitality and cognitive energy fosters positive, lifelong eating habits without body dysmorphia.",
              },
            ],
          },
        },
      ],
    },
    {
      title: "Module 6: Future Pathways & Empowerment",
      description:
        "Fostering independent decision-making, digital citizenship, goal-setting frameworks, and self-leadership.",
      timeDuration: 45,
      thumbnailUrl: "https://infano-prod.duckdns.org/images/Module6.png",
      order: 6,
      chapters: [
        {
          title: "Goal Setting & Decision Making (M6C1)",
          description:
            "Practical frameworks for breaking long-term aspirations into actionable daily milestones.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM6C1.png",
          type: "VIDEO" as const,
          order: 1,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m6c1/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) transform vague dreams into actionable roadmaps.",
            "Focusing on daily habits (systems) yields far higher goal achievement than fixating purely on end outcomes.",
            "Decision matrices help teenagers evaluate complex choices (college majors, extracurriculars, jobs) rationally.",
            "Visual tracking of daily progress triggers dopamine reinforcement, sustaining long-term motivation.",
          ],
          faqs: [
            {
              question: "What if my teenager has no idea what career they want to pursue?",
              answer:
                "Remind them that career exploration is iterative. Encourage broad curiosity, internships, volunteering, and learning transferable skills first.",
            },
            {
              question: "How do we prevent goal overwhelm in high school?",
              answer:
                "Limit major focuses to 2-3 priorities at a time (e.g. 1 academic goal, 1 physical goal, 1 creative hobby) to avoid dilution of effort.",
            },
            {
              question: "How can teens make good decisions under high peer pressure?",
              answer:
                "Teach them to pause and ask: 'Will I be proud of this decision tomorrow morning?' before making irreversible choices.",
            },
          ],
        },
        {
          title: "Empowerment & Self-Leadership (M6C2)",
          description:
            "Developing self-efficacy, intrinsic motivation, and resilient future-readiness.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM6C2.png",
          type: "VIDEO" as const,
          order: 2,
          video: {
            videoUrl: "https://infano-prod.duckdns.org/videos/m6c2/1080p.mp4",
            duration: 15,
          },
          goodToKnowPoints: [
            "Intrinsic motivation thrives when 3 core psychological needs are met: Autonomy, Competence, and Relatedness.",
            "Self-leadership begins with personal integrity: doing the right thing when nobody is watching.",
            "Financial literacy (budgeting, compounding interest, delayed gratification) is vital for early adult independence.",
            "The ultimate goal of parenting is raising an autonomous, resilient, and empathetic adult.",
          ],
          faqs: [
            {
              question: "How do parents transition from managers to trusted life advisors?",
              answer:
                "Gradually stop issuing top-down directives; instead, ask empowering questions: 'What are your options here?' and 'How can I best support your plan?'",
            },
            {
              question: "What is self-efficacy?",
              answer:
                "It is a person's belief in their ability to succeed in specific situations. It is cultivated through accumulating small mastery experiences over time.",
            },
            {
              question: "How can young adults handle fear of the unknown after high school?",
              answer:
                "Normalize uncertainty as a universal human experience. Focus on taking the next best single step rather than mapping the entire decade.",
            },
          ],
        },
        {
          title: "Final Capstone Assessment: Future Pathways & Life Mastery",
          description: "Comprehensive capstone assessment evaluating full course mastery.",
          thumbnailUrl: "https://infano-prod.duckdns.org/images/ThumbnailM6C2.png",
          type: "ASSESSMENT" as const,
          order: 3,
          assessment: {
            passingScore: 80,
            questions: [
              {
                question: "According to self-determination theory, what three core psychological needs fuel intrinsic motivation?",
                options: [
                  "Wealth, Fame, and Social Media Popularity",
                  "Autonomy (choice), Competence (mastery), and Relatedness (belonging)",
                  "Strict discipline, Constant testing, and Public ranking",
                  "Fear, Obligation, and Guilt",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Deci and Ryan's Self-Determination Theory proves Autonomy, Competence, and Relatedness are the cornerstones of intrinsic human motivation.",
              },
              {
                question: "When helping an adolescent transition into adulthood, what is the most empowering parental role?",
                options: [
                  "A micro-manager who controls all schedules and decisions",
                  "A trusted mentor and advisor who asks empowering questions and supports their autonomous problem-solving",
                  "A completely detached roommate who offers zero guidance",
                  "A strict authoritarian who forbids independent choices",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Transitioning from manager to mentor empowers young adults to develop robust self-governance and self-efficacy.",
              },
              {
                question: "What is the primary advantage of focusing on daily habit systems rather than distant end goals alone?",
                options: [
                  "Habit systems provide consistent daily progress and dopamine reinforcement, making achievement sustainable",
                  "Habits require no mental effort",
                  "Goals never work under any circumstance",
                  "Systems guarantee immediate overnight wealth",
                ],
                correctOptionIndex: 0,
                explanation:
                  "Systems build identity-based atomic habits that sustain progress long after initial goal excitement fades.",
              },
              {
                question: "What is the key takeaway of the entire Infano Adolescent & Parenting Masterclass?",
                options: [
                  "Adolescence is a crisis to be feared and suppressed",
                  "Adolescence is a transformative window of rapid growth, requiring empathy, clear boundaries, restorative trust, and empowering mentorship",
                  "Parents must ensure teens never experience any discomfort or failure",
                  "Teenagers must be forced to follow their parents' exact career choices",
                ],
                correctOptionIndex: 1,
                explanation:
                  "Adolescence is an incredible developmental transition where empathetic parenting, healthy boundaries, and mutual trust foster resilient, thriving adults.",
              },
            ],
          },
        },
      ],
    },
  ],
};

export async function seedSingleCourse() {
  console.log("🧹 Clearing all existing LMS courses...");

  try {
    const deleted = await prisma.lmsCourse.deleteMany({});
    console.log(`✓ Removed ${deleted.count} old course(s) and cascading records.`);

    console.log(`\n🌱 Seeding Master Course: "${SINGLE_MASTER_COURSE.title}"...`);

    const createdCourse = await prisma.lmsCourse.create({
      data: {
        title: SINGLE_MASTER_COURSE.title,
        description: SINGLE_MASTER_COURSE.description,
        timeDuration: SINGLE_MASTER_COURSE.timeDuration,
        price: SINGLE_MASTER_COURSE.price,
        isFree: SINGLE_MASTER_COURSE.isFree,
        isActive: SINGLE_MASTER_COURSE.isActive,
        thumbnailUrl: SINGLE_MASTER_COURSE.thumbnailUrl,
        category: SINGLE_MASTER_COURSE.category,
        highlights: SINGLE_MASTER_COURSE.highlights,
      },
    });

    console.log(`✓ Master Course ID: ${createdCourse.id}`);

    for (const moduleData of SINGLE_MASTER_COURSE.modules) {
      console.log(`\n  📦 Module ${moduleData.order}: "${moduleData.title}"`);

      const createdModule = await prisma.lmsModule.create({
        data: {
          courseId: createdCourse.id,
          title: moduleData.title,
          description: moduleData.description,
          timeDuration: moduleData.timeDuration,
          thumbnailUrl: moduleData.thumbnailUrl,
          order: moduleData.order,
        },
      });

      for (const chapterData of moduleData.chapters) {
        console.log(`    ${chapterData.type === "VIDEO" ? "🎬 Video" : "📝 Quiz"} Lesson ${chapterData.order}: "${chapterData.title}"`);

        const createdChapter = await prisma.lmsChapter.create({
          data: {
            moduleId: createdModule.id,
            title: chapterData.title,
            description: chapterData.description,
            thumbnailUrl: chapterData.thumbnailUrl,
            type: chapterData.type,
            order: chapterData.order,
            goodToKnowPoints: chapterData.goodToKnowPoints || [],
            faqs: (chapterData.faqs as any) || [],
          },
        });

        if (chapterData.type === "VIDEO" && (chapterData as any).video) {
          await prisma.lmsVideo.create({
            data: {
              chapterId: createdChapter.id,
              videoUrl: (chapterData as any).video.videoUrl,
              duration: (chapterData as any).video.duration,
            },
          });
        } else if (chapterData.type === "ASSESSMENT" && (chapterData as any).assessment) {
          await prisma.lmsAssessment.create({
            data: {
              chapterId: createdChapter.id,
              passingScore: (chapterData as any).assessment.passingScore,
              questions: (chapterData as any).assessment.questions as any,
            },
          });
        }
      }
    }

    console.log("\n🎉 Successfully seeded complete master course with 6 modules, 19 videos, 6 quizzes, rich facts & FAQs!");
  } catch (error) {
    console.error("❌ Error seeding LMS course:", error);
    throw error;
  }
}

// Execute directly if run via CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("lms.seed.ts")) {
  seedSingleCourse()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
