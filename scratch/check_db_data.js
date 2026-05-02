
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkData() {
  try {
    console.log('Checking BlogPost table...');
    const posts = await pool.query('SELECT count(*) FROM "BlogPost"');
    console.log(`Total BlogPosts: ${posts.rows[0].count}`);

    const sample = await pool.query('SELECT title, "isPublished", "isDeleted" FROM "BlogPost" LIMIT 5');
    console.log('Sample posts:', sample.rows);

    console.log('\nChecking BlogCategory table...');
    const categories = await pool.query('SELECT count(*) FROM "BlogCategory"');
    console.log(`Total BlogCategories: ${categories.rows[0].count}`);

    console.log('\nChecking BlogAuthor table...');
    const authors = await pool.query('SELECT count(*) FROM "BlogAuthor"');
    console.log(`Total BlogAuthors: ${authors.rows[0].count}`);

  } catch (err) {
    console.error('Error checking database:', err.message);
    if (err.message.includes('relation "BlogPost" does not exist')) {
        console.log('Table BlogPost does not exist! Migration might be needed.');
    }
  } finally {
    await pool.end();
  }
}

checkData();
