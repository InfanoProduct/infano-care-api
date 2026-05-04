import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding blog metadata...');

  const longContentTemplate = `
<h2>Introduction</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum. Donec in efficitur ipsum, in egestas orci. Nunc accumsan tristique nibh, id malesuada sem hendrerit elementum. Aliquam ac justo vel nisl feugiat rhoncus. Suspendisse pulvinar magna vitae tempor auctor.</p>
<p>Sed nec lectus non tellus mattis feugiat at vel eros. Sed sit amet justo vitae lacus tincidunt vulputate a vel tortor. Nullam ut accumsan augue. Mauris non enim et diam varius accumsan in vel elit.</p>

<h3>Deep Dive</h3>
<p>Phasellus egestas quam pretium tellus aliquam, id pulvinar sapien pellentesque. Vivamus sit amet odio ut nisi sodales interdum in ut eros. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.</p>
<p>Nullam rutrum justo at massa accumsan, nec efficitur justo semper. Donec interdum, tortor vel vulputate pharetra, lorem sapien ultrices est, sed consequat mauris metus in velit. Cras et felis non nulla vulputate cursus a ullamcorper massa.</p>

<img src="https://images.unsplash.com/photo-1516321497487-e288fb19713f" alt="Sample inline image" style="width:100%; border-radius: 8px; margin: 2rem 0;" />

<h3>Key Takeaways</h3>
<ul>
  <li>Always prioritize your long-term goals.</li>
  <li>Consistency is more important than intensity.</li>
  <li>Don't be afraid to make mistakes along the way.</li>
</ul>

<p>Curabitur euismod mi scelerisque, sagittis urna et, semper mauris. Nam egestas in metus in viverra. Quisque hendrerit ipsum sit amet pellentesque consequat. Etiam tempor, enim in suscipit tristique, sapien purus vehicula tortor, nec finibus mi lectus id massa.</p>

<blockquote>
  "The only way to do great work is to love what you do." - Steve Jobs
</blockquote>

<p>Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nam ut elit sit amet elit interdum convallis. Aliquam ac metus non leo elementum condimentum ac sit amet eros.</p>
`;

  // Create Authors
  const authors = [
    { name: 'Dr. Sarah Smith', role: 'Chief Medical Officer', bio: 'Expert in adolescent health and gynecology.' },
    { name: 'Priya Sharma', role: 'Lead Content Writer', bio: 'Specializes in wellness and mental health for teens.' },
  ];

  for (const author of authors) {
    await prisma.blogAuthor.upsert({
      where: { id: author.name.toLowerCase().replace(/ /g, '-') }, // Using a stable ID for seeding
      update: author,
      create: {
        id: author.name.toLowerCase().replace(/ /g, '-'),
        ...author
      },
    });
  }

  // Create Categories
  const categories = [
    { name: 'Health & Wellness', slug: 'health-wellness', description: 'Tips for staying healthy.' },
    { name: 'Mental Space', slug: 'mental-space', description: 'Understanding your mind and emotions.' },
    { name: 'Period Power', slug: 'period-power', description: 'Everything about your cycle.' },
    { name: 'Life & Style', slug: 'life-style', description: 'Navigating life as a teen.' },
  ];

  for (const category of categories) {
    await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  // Create Multiple Blog Posts
  const posts = [
    {
      title: 'The 50/30/20 Rule That Changed My Finances',
      slug: 'the-50-30-20-rule-that-changed-my-finances',
      summary: 'Learn how this simple budgeting rule can help you manage your allowance and savings effectively.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f',
      isPublished: true,
      publishedAt: new Date(),
      readTime: 5,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'life-style'
    },
    {
      title: 'Understanding Your Cycle: A Guide for Teens',
      slug: 'understanding-your-cycle-teens',
      summary: 'Everything you need to know about what happens during your monthly cycle and why it matters.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514',
      isPublished: true,
      publishedAt: new Date(Date.now() - 86400000), // 1 day ago
      readTime: 8,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'period-power'
    },
    {
      title: '5 Habits for a Calmer Mind',
      slug: '5-habits-calmer-mind',
      summary: 'Small changes in your daily routine that can significantly improve your mental well-being.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
      isPublished: true,
      publishedAt: new Date(Date.now() - 172800000), // 2 days ago
      readTime: 6,
      authorId: 'priya-sharma',
      categorySlug: 'mental-space'
    },
    {
      title: 'Nutrition Tips for Active Teens',
      slug: 'nutrition-tips-active-teens',
      summary: 'Fuel your body the right way to stay energized for sports, school, and hanging out with friends.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
      isPublished: true,
      publishedAt: new Date(Date.now() - 259200000), // 3 days ago
      readTime: 7,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'health-wellness'
    },
    {
      title: 'The Art of Journaling',
      slug: 'art-of-journaling',
      summary: 'Discover how writing down your thoughts can help you process emotions and track your growth.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db',
      isPublished: true,
      publishedAt: new Date(Date.now() - 345600000), // 4 days ago
      readTime: 4,
      authorId: 'priya-sharma',
      categorySlug: 'mental-space'
    },
    {
      title: 'Period Myths Debunked',
      slug: 'period-myths-debunked',
      summary: 'Separating fact from fiction when it comes to menstruation. Let\'s clear up some common misconceptions.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2',
      isPublished: true,
      publishedAt: new Date(Date.now() - 432000000), // 5 days ago
      readTime: 10,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'period-power'
    },
    {
      title: 'Navigating Friendships in High School',
      slug: 'navigating-friendships-high-school',
      summary: 'Tips for building healthy relationships and handling the ups and downs of social circles.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac',
      isPublished: true,
      publishedAt: new Date(Date.now() - 518400000), // 6 days ago
      readTime: 9,
      authorId: 'priya-sharma',
      categorySlug: 'life-style'
    },
    {
      title: 'Increasing Prosperity With Positive Thinking',
      slug: 'increasing-prosperity-positive-thinking',
      summary: 'How shifting your mindset can lead to a more fulfilling and successful life.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721',
      isPublished: true,
      publishedAt: new Date(Date.now() - 604800000), // 7 days ago
      readTime: 6,
      authorId: 'priya-sharma',
      categorySlug: 'life-style'
    },
    {
      title: 'Crispy Air Fryer Parmesan Roasted Wedge Fries',
      slug: 'air-fryer-parmesan-fries',
      summary: 'A healthy and delicious alternative to traditional deep-fried snacks.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1573082818143-241124562780',
      isPublished: true,
      publishedAt: new Date(Date.now() - 691200000), // 8 days ago
      readTime: 5,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'health-wellness'
    },
    {
      title: 'Boxed Water Partners With Rag & Bone',
      slug: 'boxed-water-partnership',
      summary: 'A look into the latest sustainable fashion and lifestyle collaboration.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      isPublished: true,
      publishedAt: new Date(Date.now() - 777600000), // 9 days ago
      readTime: 4,
      authorId: 'priya-sharma',
      categorySlug: 'life-style'
    },
    {
      title: 'Kipchoge Proves He Has No Equal',
      slug: 'kipchoge-marathon-history',
      summary: 'The story behind the 2nd fastest marathon time in history and the legend of Eliud Kipchoge.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca',
      isPublished: true,
      publishedAt: new Date(Date.now() - 864000000), // 10 days ago
      readTime: 12,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'health-wellness'
    },
    {
      title: 'Get Around Easily With A New York Limousine Service',
      slug: 'ny-limo-service-guide',
      summary: 'Navigating the city in style and comfort with professional transport services.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1549417229-aa67d3263c09',
      isPublished: true,
      publishedAt: new Date(Date.now() - 950400000), // 11 days ago
      readTime: 8,
      authorId: 'priya-sharma',
      categorySlug: 'life-style'
    },
    {
      title: 'Stocking Your Restaurant Kitchen Finding Reliable Sellers',
      slug: 'restaurant-kitchen-supply-guide',
      summary: 'Essential tips for sourcing high-quality ingredients and equipment for professional kitchens.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d',
      isPublished: true,
      publishedAt: new Date(Date.now() - 1036800000), // 12 days ago
      readTime: 11,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'health-wellness'
    },
    {
      title: 'Barbeque Techniques Two Methods To Consider',
      slug: 'barbeque-techniques-guide',
      summary: 'Master the art of grilling with these two essential BBQ methods for perfect results every time.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd',
      isPublished: true,
      publishedAt: new Date(Date.now() - 1123200000), // 13 days ago
      readTime: 7,
      authorId: 'priya-sharma',
      categorySlug: 'life-style'
    },
    {
      title: 'Sony Laptops Are Still Part Of The Sony Family',
      slug: 'sony-laptops-legacy',
      summary: 'Exploring the history and current state of Sony’s computing division.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1544006659-f0b21f04cb1d',
      isPublished: true,
      publishedAt: new Date(Date.now() - 1209600000), // 14 days ago
      readTime: 6,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'health-wellness'
    },
    {
      title: 'Trip To Iqaluit In Nunavut A Canadian Arctic City',
      slug: 'iqaluit-travel-guide',
      summary: 'A journey to the edge of the world: what to expect in Canada\'s northernmost capital.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda',
      isPublished: true,
      publishedAt: new Date(Date.now() - 1296000000), // 15 days ago
      readTime: 15,
      authorId: 'priya-sharma',
      categorySlug: 'life-style'
    },
    {
      title: 'Thousands Now Adware Removal Who Never Thought They Could',
      slug: 'adware-removal-success',
      summary: 'How simple tools and education are helping people clean their digital lives.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3',
      isPublished: true,
      publishedAt: new Date(Date.now() - 1382400000), // 16 days ago
      readTime: 9,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'health-wellness'
    },
    {
      title: 'To Keep Makeup Looking Fresh Take A Powder',
      slug: 'makeup-powder-tips',
      summary: 'Expert advice on using setting powders to maintain your look all day long.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
      isPublished: true,
      publishedAt: new Date(Date.now() - 1468800000), // 17 days ago
      readTime: 4,
      authorId: 'priya-sharma',
      categorySlug: 'life-style'
    },
    {
      title: 'Going Wireless With Your Headphones',
      slug: 'wireless-headphones-guide',
      summary: 'The benefits and drawbacks of making the switch to Bluetooth audio.',
      content: longContentTemplate,
      thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
      isPublished: true,
      publishedAt: new Date(Date.now() - 1555200000), // 18 days ago
      readTime: 8,
      authorId: 'dr.-sarah-smith',
      categorySlug: 'health-wellness'
    }
  ];

  for (const postData of posts) {
    const { categorySlug, ...data } = postData;
    const post = await prisma.blogPost.upsert({
      where: { slug: data.slug },
      update: data,
      create: {
        ...data,
        categories: {
          connect: [{ slug: categorySlug }]
        }
      }
    });
    console.log('Upserted post:', post.title);
  }

  console.log('Blog seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
