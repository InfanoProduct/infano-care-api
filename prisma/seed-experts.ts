import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EXPERTS_TO_SEED = [
  {
    username: 'dr.ananya@infano.com',
    displayName: 'Dr. Ananya Iyer',
    phone: '+919811122233',
    bio: 'Adolescent Gynecologist & Puberty Expert with 12+ years of clinical experience guiding young women.',
    expertise: { department: 'Gynecology', clinicalFocus: 'Puberty shifts, PCOS, menstrual cycles', credentials: 'MD, DNB (Obstetrics & Gynecology)' },
    specialisation: 'Gynecologist & Puberty Expert',
    sessionPrice: 800
  },
  {
    username: 'meera.sharma@infano.com',
    displayName: 'Meera Sharma',
    phone: '+919811122244',
    bio: 'Licensed Adolescent Psychologist dedicated to helping teens navigate high school stress, body image, and emotions.',
    expertise: { department: 'Psychology', clinicalFocus: 'Anxiety, school stress, self-identity, self-esteem', credentials: 'M.Sc. in Clinical Psychology, M.Phil' },
    specialisation: 'Teen Psychologist',
    sessionPrice: 600
  },
  {
    username: 'shalini.sen@infano.com',
    displayName: 'Shalini Sen',
    phone: '+919811122255',
    bio: 'Menstrual Health Educator and Advocate focused on shame-free education, puberty guides, and body comfort.',
    expertise: { department: 'Educator', clinicalFocus: 'Puberty hygiene, safe boundaries, confidence coaching', credentials: 'MA in Social Work, Certified Sexuality Educator' },
    specialisation: 'Menstrual Hygiene Educator',
    sessionPrice: 500
  },
  {
    username: 'dr.kiran.shah@infano.com',
    displayName: 'Dr. Kiran Shah',
    phone: '+919811122266',
    bio: 'Board-certified Dermatologist specializing in adolescent acne, skincare routines, and body positive dermatology.',
    expertise: { department: 'Dermatology', clinicalFocus: 'Adolescent acne, skincare, skin conditions', credentials: 'MD in Dermatology, MBBS' },
    specialisation: 'Dermatologist',
    sessionPrice: 900
  },
  {
    username: 'rohan.mehta@infano.com',
    displayName: 'Rohan Mehta',
    phone: '+919811122277',
    bio: 'Adolescent Career Counselor helping teens identify their passions, build study plans, and navigate college applications.',
    expertise: { department: 'Career Counseling', clinicalFocus: 'Academic planning, goal setting, stream selection', credentials: 'MA in Counseling, Certified Career Coach' },
    specialisation: 'Career Counselor',
    sessionPrice: 700
  },
  {
    username: 'kavita.sen@infano.com',
    displayName: 'Kavita Sen',
    phone: '+919811122288',
    bio: 'Youth Financial Literacy expert educating teens and parents on budgeting, savings, pocket money habits, and investment basics.',
    expertise: { department: 'Finance', clinicalFocus: 'Financial literacy, basic budgeting, savings coach', credentials: 'MBA in Finance, Certified Financial Planner' },
    specialisation: 'Financial Advisor',
    sessionPrice: 650
  },
  {
    username: 'adv.priya.roy@infano.com',
    displayName: 'Adv. Priya Roy',
    phone: '+919811122299',
    bio: 'Child & Family Rights Advocate providing guidance on personal boundaries, child safety laws, and legal self-awareness.',
    expertise: { department: 'Legal Advocacy', clinicalFocus: 'Adolescent rights, safe spaces, legal literacy', credentials: 'BA LLB (Hons), Child Rights Specialist' },
    specialisation: 'Advocate',
    sessionPrice: 750
  }
];

async function main() {
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  console.log(`[Seed] Beginning expert seeding...`);

  for (const exp of EXPERTS_TO_SEED) {
    console.log(`- Upserting expert: ${exp.displayName} (${exp.username})`);
    
    // Check phone availability
    const existingPhone = await prisma.user.findUnique({ where: { phone: exp.phone } });
    const phoneToUse = existingPhone && existingPhone.username !== exp.username
      ? `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`
      : exp.phone;

    await prisma.user.upsert({
      where: { username: exp.username },
      update: {
        password: hashedPassword,
        role: 'EXPERT',
        accountStatus: 'ACTIVE',
        profile: {
          upsert: {
            create: {
              displayName: exp.displayName,
              bio: exp.bio,
              mentorStatus: 'certified',
              isAvailable: true,
              mentorExpertise: exp.expertise,
              specialisation: exp.specialisation,
              sessionPrice: exp.sessionPrice
            },
            update: {
              displayName: exp.displayName,
              bio: exp.bio,
              mentorStatus: 'certified',
              isAvailable: true,
              mentorExpertise: exp.expertise,
              specialisation: exp.specialisation,
              sessionPrice: exp.sessionPrice
            }
          }
        }
      },
      create: {
        username: exp.username,
        password: hashedPassword,
        phone: phoneToUse,
        role: 'EXPERT',
        accountStatus: 'ACTIVE',
        profile: {
          create: {
            displayName: exp.displayName,
            bio: exp.bio,
            mentorStatus: 'certified',
            isAvailable: true,
            mentorExpertise: exp.expertise,
            specialisation: exp.specialisation,
            sessionPrice: exp.sessionPrice
          }
        }
      }
    });
  }

  console.log(`[Seed] Expert seeding completed successfully!`);
  console.log(`-------------------------------------------`);
  console.log(`Sign-in Credentials:`);
  EXPERTS_TO_SEED.forEach(exp => {
    console.log(`- Username: ${exp.username} / Password: ${defaultPassword}`);
  });
  console.log(`-------------------------------------------`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
