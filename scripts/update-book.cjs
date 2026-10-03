const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const newPdfFilename = 'gigi-ebook-1791034229108-182256611.pdf';
  const pdfUrl = `/uploads/books/${newPdfFilename}`;

  // Purge old rendered WebP cache
  const renderedDir = path.resolve(__dirname, '..', 'uploads', 'books', 'rendered');
  if (fs.existsSync(renderedDir)) {
    console.log('Clearing old rendered cache at:', renderedDir);
    fs.rmSync(renderedDir, { recursive: true, force: true });
  }

  // Update book in DB
  const book = await prisma.book.findFirst({
    where: {
      OR: [
        { slug: 'gigi-the-ebook' },
        { title: { contains: 'Gigi', mode: 'insensitive' } }
      ]
    }
  });

  if (book) {
    const updated = await prisma.book.update({
      where: { id: book.id },
      data: {
        slug: 'gigi-the-ebook',
        title: 'Gigi: The Awkward Age',
        author: 'Infano Care',
        format: 'DIGITAL_EBOOK',
        pdfUrl: `http://localhost:4005${pdfUrl}`,
        totalPages: 231,
        stock: 999999,
        isActive: true,
      }
    });
    console.log('Book updated successfully in database:', JSON.stringify(updated, null, 2));
  } else {
    console.log('Book not found in DB to update');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
