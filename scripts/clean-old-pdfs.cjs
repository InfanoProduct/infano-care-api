const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const booksDir = path.resolve(__dirname, '..', 'uploads', 'books');
  const renderedDir = path.join(booksDir, 'rendered');

  // 1. Delete all old rendered tiles
  if (fs.existsSync(renderedDir)) {
    console.log('Purging rendered cache:', renderedDir);
    fs.rmSync(renderedDir, { recursive: true, force: true });
  }

  // 2. Delete the 3 old House Nordic sample files
  const oldPdfs = [
    '3110-house-nordic-SS26-1791013289879-908021241.pdf',
    'document-1791014868691-988336001.pdf',
    'document-1791024482130-365610985.pdf'
  ];

  for (const f of oldPdfs) {
    const fullPath = path.join(booksDir, f);
    if (fs.existsSync(fullPath)) {
      console.log('Deleting old sample PDF:', f);
      fs.unlinkSync(fullPath);
    }
  }

  // 3. Update all records in the DB to point to the real Gigi PDF
  const realPdf = 'gigi-ebook-1791034229108-182256611.pdf';
  const updated = await prisma.book.updateMany({
    where: {
      format: 'DIGITAL_EBOOK'
    },
    data: {
      slug: 'gigi-the-ebook',
      title: 'Gigi: The Awkward Age',
      author: 'Infano Care',
      pdfUrl: `http://localhost:4005/uploads/books/${realPdf}`,
      totalPages: 231,
      stock: 999999,
      isActive: true
    }
  });
  console.log('Updated DB records:', updated);
}

main().catch(console.error).finally(() => prisma.$disconnect());
