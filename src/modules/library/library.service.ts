import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { EtsyService } from "./etsy.service.js";
import { logger } from "../../config/logger.js";
import { sendBookUnlockedEmail } from "../../common/services/email.service.js";

// Default seed data for "Gigi the Book" eBook
const DEFAULT_GIGI_BOOK = {
  slug: "gigi-the-book",
  title: "Gigi the Book: A Journey of Growing Up",
  author: "Infano Care",
  description: "An empowering, heartwarming, and educational illustrated story guiding young teens and parents through the emotional, biological, and social journeys of growing up with confidence.",
  imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
  price: 9.99,
  stock: 9999,
  totalPages: 120,
  chapters: [
    {
      id: "ch-1",
      title: "Chapter 1: The First Spark of Change",
      pageStart: 1,
      pageEnd: 20,
      summary: "Meet Gigi as she navigates the confusing beginnings of bodily and emotional changes.",
      contentHtml: `
        <h2>Chapter 1: The First Spark of Change</h2>
        <p>Morning sunlight streamed through the curtains of Gigi's bedroom, casting long shadows across her desk. Today felt subtly different from yesterday. It wasn't just the calendar turning over to a new school term; it was the realization that her body, her thoughts, and the world around her were evolving.</p>
        <p>Gigi stood in front of the mirror, noticing the subtle shifts that had quietly begun over the past few months. <em>"Am I the only one feeling this way?"</em> she wondered silently. Little did she know, millions of young teens across the world stood in front of their own mirrors asking the very same question.</p>
        <p>Puberty isn't a single overnight event. It is a symphony of gradual discoveries—hormones orchestrating physical milestones, emotional clarity, and a developing sense of self-identity.</p>
        <blockquote>"Growing up isn't about having all the answers right away; it's about learning to trust your own rhythm."</blockquote>
        <p>In this chapter, we explore what physical changes happen first, why emotions can feel like rollercoasters, and how communication with parents or trusted mentors makes every step smoother.</p>
      `
    },
    {
      id: "ch-2",
      title: "Chapter 2: Decoding the Biology (Without the Stress)",
      pageStart: 21,
      pageEnd: 45,
      summary: "A friendly, easy-to-understand breakdown of the menstrual cycle, hormones, and bodily care.",
      contentHtml: `
        <h2>Chapter 2: Decoding the Biology (Without the Stress)</h2>
        <p>Biology textbooks often make growing up sound like a complex chemical formula. But when broken down simply, your body is simply unlocking its superpowers.</p>
        <p>The menstrual cycle is a natural, healthy biological rhythm controlled by four key hormones: Estrogen, Progesterone, LH, and FSH. Think of them as team players passing the baton in a relay race.</p>
        <h3>The 4 Phases:</h3>
        <ul>
          <li><strong>Menstrual Phase (Days 1-5):</strong> The shedding of the uterine lining when pregnancy does not occur. Rest, hydration, and gentle movement are your best friends.</li>
          <li><strong>Follicular Phase (Days 6-13):</strong> Energy begins rising as estrogen increases. A great time for learning and creative projects!</li>
          <li><strong>Ovulation (Day 14):</strong> The peak energy window of the cycle.</li>
          <li><strong>Luteal Phase (Days 15-28):</strong> Progesterone prepares the body, and PMS signals might arise. Nutrition and self-care take center stage.</li>
        </ul>
      `
    },
    {
      id: "ch-3",
      title: "Chapter 3: Emotional Harmony & Friendships",
      pageStart: 46,
      pageEnd: 75,
      summary: "Managing mood swings, social pressure, and fostering deep, healthy peer connections.",
      contentHtml: `
        <h2>Chapter 3: Emotional Harmony & Friendships</h2>
        <p>Have you ever felt ecstatic one minute, and completely overwhelmed the next? During puberty, the brain's emotional center (the amygdala) develops faster than the reasoning center (the prefrontal cortex).</p>
        <p>This means your intense feelings are not 'weird' or 'dramatic'—they are literally brain science at work! Learning mindful breathing, journaling, and talking in safe peer circles allows you to master your emotional weather without being swept away by the storm.</p>
      `
    },
    {
      id: "ch-4",
      title: "Chapter 4: The Parents' Bridge of Understanding",
      pageStart: 76,
      pageEnd: 100,
      summary: "How teens and parents can communicate openly about boundaries, care, and mutual trust.",
      contentHtml: `
        <h2>Chapter 4: The Parents' Bridge of Understanding</h2>
        <p>Communication between parents and teens doesn't have to be a battlefield. Both sides usually want the exact same thing: safety, love, and understanding.</p>
        <p>In this chapter, Gigi shares practical conversation starters that break the ice and turn awkward moments into moments of deep family connection.</p>
      `
    },
    {
      id: "ch-5",
      title: "Chapter 5: Stepping Forward with Confidence",
      pageStart: 101,
      pageEnd: 120,
      summary: "Empowering daily self-care habits, wellness routines, and embracing your unique journey.",
      contentHtml: `
        <h2>Chapter 5: Stepping Forward with Confidence</h2>
        <p>As Gigi looks back on her journey, she realizes that growing up isn't a test to pass—it is an adventure to embrace. With the right knowledge, supportive community circles, and self-compassion, you can step into every new day with glowing confidence.</p>
        <p class="reader-closing"><em>Congratulations on completing Gigi the Book! Remember to check out Infano's interactive tracking and community circles in your dashboard.</em></p>
      `
    }
  ]
};

export class LibraryService {
  /**
   * Ensures the default Gigi eBook exists in the database
   */
  static async ensureDefaultBook() {
    let book = await prisma.book.findFirst({
      where: {
        OR: [
          { slug: DEFAULT_GIGI_BOOK.slug },
          { title: { contains: "Gigi", mode: "insensitive" } }
        ]
      }
    });

    if (!book) {
      book = await prisma.book.create({
        data: {
          slug: DEFAULT_GIGI_BOOK.slug,
          title: DEFAULT_GIGI_BOOK.title,
          author: DEFAULT_GIGI_BOOK.author,
          description: DEFAULT_GIGI_BOOK.description,
          imageUrl: DEFAULT_GIGI_BOOK.imageUrl,
          price: DEFAULT_GIGI_BOOK.price,
          stock: DEFAULT_GIGI_BOOK.stock,
          totalPages: DEFAULT_GIGI_BOOK.totalPages,
          pdfUrl: "/uploads/books/3110-house-nordic-SS26-1791013289879-908021241.pdf",
          chapters: DEFAULT_GIGI_BOOK.chapters,
          isActive: true
        }
      });
      logger.info({ bookId: book.id }, "[LibraryService] Seeded default Gigi the Book eBook");
    } else if (!book.slug || !book.pdfUrl) {
      // Update existing record with slug and default pdfUrl if missing
      book = await prisma.book.update({
        where: { id: book.id },
        data: {
          slug: book.slug || DEFAULT_GIGI_BOOK.slug,
          pdfUrl: book.pdfUrl || "/uploads/books/3110-house-nordic-SS26-1791013289879-908021241.pdf",
        }
      });
    }

    return book;
  }

  /**
   * Get all books in the logged-in user's library
   */
  static async getMyLibrary(userId: string) {
    await this.ensureDefaultBook();

    const entitlements = await prisma.userBookEntitlement.findMany({
      where: { userId },
      include: {
        book: {
          select: {
            id: true,
            slug: true,
            title: true,
            author: true,
            description: true,
            imageUrl: true,
            totalPages: true,
            isActive: true,
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return entitlements.map((ent) => ({
      entitlementId: ent.id,
      bookId: ent.book.id,
      slug: ent.book.slug,
      title: ent.book.title,
      author: ent.book.author,
      description: ent.book.description,
      coverImageUrl: ent.book.imageUrl,
      totalPages: ent.book.totalPages,
      lastReadPage: ent.lastReadPage,
      progressPercent: ent.progressPercent,
      bookmarksCount: Array.isArray(ent.bookmarks) ? (ent.bookmarks as any[]).length : 0,
      source: ent.source,
      unlockedAt: ent.createdAt,
      lastReadAt: ent.updatedAt,
    }));
  }

  /**
   * Claim an Etsy Order Receipt and unlock the book for the user
   */
  static async claimEtsyOrder(userId: string, receiptId: string) {
    const cleanReceiptId = receiptId.trim().replace("#", "");

    if (!cleanReceiptId) {
      throw new AppError("Please provide a valid Etsy Receipt / Order ID", 400);
    }

    // 1. Check if this receipt was already claimed by any user
    const existingClaim = await prisma.etsyOrderClaim.findUnique({
      where: { receiptId: cleanReceiptId }
    });

    if (existingClaim && existingClaim.isClaimed) {
      if (existingClaim.claimedByUserId === userId) {
        return {
          message: "You have already unlocked this book on your account.",
          isNewClaim: false,
          receiptId: cleanReceiptId,
        };
      }
      throw new AppError("This Etsy order receipt has already been claimed by another Infano account.", 409);
    }

    // 2. Verify with Etsy Open API
    const verification = await EtsyService.verifyReceipt(cleanReceiptId);
    if (!verification.isValid || !verification.isPaid) {
      throw new AppError("Etsy order verification failed or payment is incomplete.", 400);
    }

    // 3. Ensure the Gigi Book exists in DB
    const book = await this.ensureDefaultBook();

    // 4. Record Entitlement & Claim atomically
    await prisma.$transaction(async (tx) => {
      // Upsert User Book Entitlement
      await tx.userBookEntitlement.upsert({
        where: {
          userId_bookId: {
            userId,
            bookId: book.id
          }
        },
        create: {
          userId,
          bookId: book.id,
          source: "etsy",
          orderReference: cleanReceiptId,
          lastReadPage: 1,
          progressPercent: 0.0
        },
        update: {
          orderReference: cleanReceiptId,
          source: "etsy"
        }
      });

      // Record / Update Etsy Claim Log
      await tx.etsyOrderClaim.upsert({
        where: { receiptId: cleanReceiptId },
        create: {
          receiptId: cleanReceiptId,
          buyerEmail: verification.buyerEmail,
          buyerName: verification.buyerName,
          listingId: verification.listingId,
          bookSlug: book.slug || "gigi-the-book",
          claimedByUserId: userId,
          isClaimed: true,
          claimedAt: new Date()
        },
        update: {
          claimedByUserId: userId,
          isClaimed: true,
          claimedAt: new Date()
        }
      });
    });

    logger.info({ userId, receiptId: cleanReceiptId }, "[LibraryService] Successfully unlocked Gigi the Book from Etsy order");

    // 5. In-app notification creation
    try {
      await prisma.notificationHistory.create({
        data: {
          userId,
          type: "BOOK_UNLOCKED",
          title: "Gigi the Book Unlocked! 🎉",
          body: "Your Etsy purchase has been verified. You can now read Gigi the Book on Web and Mobile.",
          deepLink: "/library",
          payload: { receiptId: cleanReceiptId, bookSlug: book.slug || "gigi-the-book" },
          sentAt: new Date()
        }
      });
    } catch (notifErr) {
      logger.warn({ notifErr }, "[LibraryService] Non-blocking notification failure");
    }

    // 6. Automatic Family Sharing for linked Parent & Teen accounts
    try {
      const familyLinks = await prisma.parentLink.findMany({
        where: {
          OR: [
            { parentId: userId, status: "ACTIVE" },
            { teenId: userId, status: "ACTIVE" }
          ]
        }
      });

      for (const link of familyLinks) {
        const familyMemberId = link.parentId === userId ? link.teenId : link.parentId;
        if (familyMemberId) {
          await prisma.userBookEntitlement.upsert({
            where: {
              userId_bookId: {
                userId: familyMemberId,
                bookId: book.id
              }
            },
            create: {
              userId: familyMemberId,
              bookId: book.id,
              source: "family_share",
              orderReference: cleanReceiptId,
              lastReadPage: 1,
              progressPercent: 0.0
            },
            update: {
              orderReference: cleanReceiptId,
              source: "family_share"
            }
          });
          logger.info({ familyMemberId, bookId: book.id }, "[LibraryService] Granted family share eBook entitlement");
        }
      }
    } catch (familyErr) {
      logger.warn({ familyErr }, "[LibraryService] Non-blocking family share sync failure");
    }

    // 7. Dispatch Email #2 (Book Unlocked Confirmation)
    try {
      const claimingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true, phone: true }
      });

      const recipientEmail = claimingUser?.email || verification.buyerEmail;
      if (recipientEmail) {
        await sendBookUnlockedEmail(recipientEmail, {
          user_name: claimingUser?.username || verification.buyerName || "Reader",
          book_title: book.title,
          read_url: `https://infanocare.com/dashboard/library/${book.slug || "gigi-the-book"}/read`
        });
        logger.info({ userId, recipientEmail }, "[LibraryService] Dispatched Email #2 (Book Unlocked) to user");
      }
    } catch (emailErr) {
      logger.warn({ emailErr, userId }, "[LibraryService] Non-blocking Email #2 failure");
    }

    return {
      message: "Congratulations! Gigi the Book has been unlocked in your Library.",
      isNewClaim: true,
      receiptId: cleanReceiptId,
      book: {
        id: book.id,
        slug: book.slug,
        title: book.title,
        totalPages: book.totalPages
      }
    };
  }

  /**
   * Helper to find book by ID, slug, or fallback
   */
  public static async findBookByIdOrSlug(bookIdOrSlug: string) {
    const cleanQuery = (bookIdOrSlug || "").trim();
    if (!cleanQuery) return null;

    let book = await prisma.book.findFirst({
      where: {
        OR: [
          { id: cleanQuery },
          { slug: cleanQuery },
          { slug: cleanQuery.toLowerCase() },
          ...(cleanQuery.includes("gigi")
            ? [
                { slug: "gigi-the-book" },
                { slug: "gigi-the-ebook" },
                { title: { contains: "Gigi", mode: "insensitive" as const } }
              ]
            : [])
        ]
      }
    });

    if (!book) {
      // Fallback to default / first active digital ebook
      book = await prisma.book.findFirst({
        where: {
          OR: [
            { format: "DIGITAL_EBOOK" },
            { slug: "gigi-the-book" },
            { slug: "gigi-the-ebook" }
          ]
        },
        orderBy: { createdAt: "desc" }
      });
    }

    return book;
  }

  /**
   * Helper to get or auto-grant entitlement for admin preview, dev testing, or verified orders
   */
  private static async getOrCreateEntitlement(userId: string, bookId: string) {
    if (!userId) return null;

    let entitlement = await prisma.userBookEntitlement.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      }
    });

    if (!entitlement) {
      const isDev = process.env.NODE_ENV !== "production";
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      const isAdmin = user?.role === "ADMIN";

      // Check if user paid for this book in web checkout
      let hasPaidOrder = false;
      try {
        const paidOrder = await prisma.order.findFirst({
          where: {
            userId,
            paymentStatus: "PAID" as any,
            items: {
              some: {
                bookId
              }
            }
          }
        });
        hasPaidOrder = !!paidOrder;
      } catch (err) {
        // non-blocking
      }

      // Auto-grant access in development, for admins, or verified buyers
      if (isAdmin || isDev || hasPaidOrder) {
        entitlement = await prisma.userBookEntitlement.upsert({
          where: {
            userId_bookId: {
              userId,
              bookId
            }
          },
          create: {
            userId,
            bookId,
            source: isAdmin ? "admin_preview" : isDev ? "dev_auto_grant" : "order_purchase",
            lastReadPage: 1,
            progressPercent: 0.0
          },
          update: {}
        });
      }
    }

    return entitlement;
  }

  /**
   * Get full book metadata and chapter list (authenticated)
   */
  static async getBookReaderMetadata(userId: string, bookIdOrSlug: string) {
    await this.ensureDefaultBook();
    const book = await this.findBookByIdOrSlug(bookIdOrSlug);

    if (!book) {
      throw new AppError("Book not found", 404);
    }

    // Verify entitlement or auto-grant for admin
    const entitlement = await this.getOrCreateEntitlement(userId, book.id);

    if (!entitlement) {
      throw new AppError("You do not have access to this book. Please claim your Etsy order or purchase access.", 403);
    }

    let chapters = book.chapters as any[];
    if (typeof chapters === "string") {
      try {
        chapters = JSON.parse(chapters);
      } catch {
        chapters = [];
      }
    }
    if (!Array.isArray(chapters)) {
      chapters = chapters ? [chapters] : [];
    }

    // Strip full text in metadata view for performance, returning table of contents
    const tableOfContents = chapters.map((ch: any, idx: number) => ({
      index: idx,
      id: ch.id || `ch-${idx + 1}`,
      title: ch.title,
      pageStart: ch.pageStart,
      pageEnd: ch.pageEnd,
      summary: ch.summary
    }));

    return {
      book: {
        id: book.id,
        slug: book.slug || "gigi-the-book",
        title: book.title,
        author: book.author,
        description: book.description,
        coverImageUrl: book.imageUrl,
        pdfUrl: (book as any).pdfUrl || null,
        totalPages: book.totalPages || (tableOfContents.length > 0 ? tableOfContents.length * 10 : 1),
        tableOfContents
      },
      readingState: {
        lastReadPage: entitlement.lastReadPage || 1,
        progressPercent: entitlement.progressPercent || 0,
        bookmarks: entitlement.bookmarks || [],
        lastAccessedAt: entitlement.updatedAt
      }
    };
  }

  /**
   * Get single chapter content for authenticated reader streaming
   */
  static async getChapterContent(userId: string, bookIdOrSlug: string, chapterIndex: number) {
    const book = await this.findBookByIdOrSlug(bookIdOrSlug);

    if (!book) {
      throw new AppError("Book not found", 404);
    }

    // Verify access
    const entitlement = await this.getOrCreateEntitlement(userId, book.id);

    if (!entitlement) {
      throw new AppError("Access denied. Please unlock this book to read.", 403);
    }

    let chapters = book.chapters as any[];
    if (typeof chapters === "string") {
      try {
        chapters = JSON.parse(chapters);
      } catch {
        chapters = [];
      }
    }
    if (!Array.isArray(chapters)) {
      chapters = chapters ? [chapters] : [];
    }

    if (chapterIndex < 0 || chapterIndex >= chapters.length) {
      throw new AppError("Chapter not found", 404);
    }

    const chapter = chapters[chapterIndex];

    return {
      chapterIndex,
      totalChapters: chapters.length,
      chapter: {
        id: chapter.id || `ch-${chapterIndex + 1}`,
        title: chapter.title,
        pageStart: chapter.pageStart,
        pageEnd: chapter.pageEnd,
        contentHtml: chapter.contentHtml,
      }
    };
  }

  /**
   * Save user's reading position and bookmarks
   */
  static async updateReadingProgress(
    userId: string,
    bookIdOrSlug: string,
    data: { lastReadPage?: number; progressPercent?: number; bookmark?: { page: number; note?: string } }
  ) {
    const book = await this.findBookByIdOrSlug(bookIdOrSlug);

    if (!book) {
      throw new AppError("Book not found", 404);
    }

    const existingEntitlement = await this.getOrCreateEntitlement(userId, book.id);

    if (!existingEntitlement) {
      throw new AppError("Entitlement not found", 403);
    }

    let bookmarks = (existingEntitlement.bookmarks as any[]) || [];
    if (data.bookmark) {
      // Toggle or add bookmark
      const existsIdx = bookmarks.findIndex((b: any) => b.page === data.bookmark!.page);
      if (existsIdx >= 0) {
        bookmarks.splice(existsIdx, 1); // remove if toggle off
      } else {
        bookmarks.push({
          page: data.bookmark.page,
          note: data.bookmark.note || "",
          createdAt: new Date().toISOString()
        });
      }
    }

    const updated = await prisma.userBookEntitlement.update({
      where: { id: existingEntitlement.id },
      data: {
        lastReadPage: data.lastReadPage ?? existingEntitlement.lastReadPage,
        progressPercent: data.progressPercent ?? existingEntitlement.progressPercent,
        bookmarks
      }
    });

    return {
      lastReadPage: updated.lastReadPage,
      progressPercent: updated.progressPercent,
      bookmarks: updated.bookmarks
    };
  }
}
