import fs from "fs";
import path from "path";
import { prisma } from "../../db/client.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../common/middleware/errorHandler.js";

let pdfjsLib: any = null;
let canvasLib: any = null;
let sharpLib: any = null;

async function getRenderingEngines() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  if (!canvasLib) {
    canvasLib = await import("@napi-rs/canvas");
  }
  if (!sharpLib) {
    sharpLib = (await import("sharp")).default;
  }
  return { pdfjs: pdfjsLib, canvas: canvasLib, sharp: sharpLib };
}

// In-memory document cache to avoid re-opening 88MB PDFs on every page request
const activeDocCache = new Map<string, { doc: any; lastUsed: number }>();

export class PageStreamingService {
  private static renderedBaseDir = path.resolve(process.cwd(), "uploads", "books", "rendered");

  /**
   * Ensure directory exists
   */
  private static ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Resolve source PDF on disk for a given book
   */
  private static resolvePdfDiskPath(pdfUrl?: string | null): string | null {
    if (!pdfUrl) return null;
    const cleanPath = pdfUrl.startsWith("/") ? pdfUrl.substring(1) : pdfUrl;
    const candidates = [
      path.resolve(process.cwd(), cleanPath),
      path.resolve(process.cwd(), "uploads", "books", path.basename(cleanPath)),
      path.resolve(process.cwd(), "..", "infano-care-api", cleanPath),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return p;
      }
    }
    return null;
  }

  /**
   * Get or load PDF document instance
   */
  private static async getPdfDoc(diskPath: string) {
    const cached = activeDocCache.get(diskPath);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.doc;
    }

    const { pdfjs } = await getRenderingEngines();
    const data = new Uint8Array(fs.readFileSync(diskPath));
    const doc = await pdfjs.getDocument({ data }).promise;

    activeDocCache.set(diskPath, { doc, lastUsed: Date.now() });

    // Clean up docs unused for more than 5 minutes
    if (activeDocCache.size > 5) {
      const now = Date.now();
      for (const [key, item] of activeDocCache.entries()) {
        if (now - item.lastUsed > 300000) {
          try {
            item.doc.destroy();
          } catch {}
          activeDocCache.delete(key);
        }
      }
    }

    return doc;
  }

  /**
   * Get metadata and total page count for a book
   */
  static async getBookManifest(bookIdOrSlug: string) {
    const book = await prisma.book.findFirst({
      where: {
        OR: [
          { id: bookIdOrSlug },
          { slug: bookIdOrSlug },
          { slug: bookIdOrSlug.toLowerCase() },
          { title: { contains: "Gigi", mode: "insensitive" } },
        ],
      },
    });

    if (!book) {
      throw new AppError("Book not found", 404);
    }

    let totalPages = book.totalPages || 1;
    const diskPath = this.resolvePdfDiskPath((book as any).pdfUrl);

    if (diskPath) {
      try {
        const doc = await this.getPdfDoc(diskPath);
        totalPages = doc.numPages;
        if (book.totalPages !== totalPages) {
          await prisma.book.update({
            where: { id: book.id },
            data: { totalPages },
          }).catch(() => {});
        }
      } catch (err) {
        logger.warn({ err }, "[PageStreamingService] Failed to read PDF page count");
      }
    }

    return {
      id: book.id,
      slug: book.slug || "gigi-the-book",
      title: book.title,
      author: book.author,
      description: book.description,
      totalPages,
      coverImageUrl: book.imageUrl,
    };
  }

  /**
   * Purge rendered tile cache
   */
  static purgeRenderCache(bookIdOrSlug?: string) {
    try {
      activeDocCache.clear();
      if (bookIdOrSlug) {
        const targetDir = path.join(this.renderedBaseDir, bookIdOrSlug);
        if (fs.existsSync(targetDir)) {
          fs.rmSync(targetDir, { recursive: true, force: true });
        }
      } else {
        if (fs.existsSync(this.renderedBaseDir)) {
          fs.rmSync(this.renderedBaseDir, { recursive: true, force: true });
        }
      }
      logger.info({ bookIdOrSlug }, "[PageStreamingService] Purged rendered tile cache");
    } catch (err) {
      logger.warn({ err }, "[PageStreamingService] Failed to purge render cache");
    }
  }

  /**
   * Render or retrieve a single page tile as WebP (~40KB - 70KB)
   */
  static async getPageImage(bookIdOrSlug: string, pageNumber: number): Promise<{ filePath: string; buffer?: Buffer }> {
    const book = await prisma.book.findFirst({
      where: {
        OR: [
          { id: bookIdOrSlug },
          { slug: bookIdOrSlug },
          { slug: bookIdOrSlug.toLowerCase() },
          { title: { contains: "Gigi", mode: "insensitive" } },
        ],
      },
    });

    if (!book) {
      throw new AppError("Book not found", 404);
    }

    const safeSlug = book.slug || `book-${book.id.substring(0, 8)}`;
    const bookOutputDir = path.join(this.renderedBaseDir, safeSlug);
    this.ensureDir(bookOutputDir);

    // 1. Resolve source PDF on disk
    const diskPath = this.resolvePdfDiskPath((book as any).pdfUrl);
    if (!diskPath) {
      throw new AppError("Source eBook document not found on server", 404);
    }

    // 2. Auto-detect if source PDF changed (size, mtime, or name)
    const stat = fs.statSync(diskPath);
    const markerFile = path.join(bookOutputDir, ".source-info");
    const currentInfo = `${path.basename(diskPath)}-${stat.size}-${stat.mtimeMs}`;
    if (fs.existsSync(markerFile)) {
      const savedInfo = fs.readFileSync(markerFile, "utf-8").trim();
      if (savedInfo !== currentInfo) {
        logger.info({ bookSlug: safeSlug }, "[PageStreamingService] Source PDF changed! Purging old rendered tiles.");
        activeDocCache.delete(diskPath);
        fs.rmSync(bookOutputDir, { recursive: true, force: true });
        this.ensureDir(bookOutputDir);
        fs.writeFileSync(markerFile, currentInfo);
      }
    } else {
      fs.writeFileSync(markerFile, currentInfo);
    }

    const targetPageWebp = path.join(bookOutputDir, `page-${pageNumber}.webp`);

    // 3. Return from disk cache if already rendered
    if (fs.existsSync(targetPageWebp)) {
      return { filePath: targetPageWebp };
    }

    // 4. Render from source PDF
    const { canvas, sharp } = await getRenderingEngines();
    const doc = await this.getPdfDoc(diskPath);

    if (pageNumber < 1 || pageNumber > doc.numPages) {
      throw new AppError(`Page number ${pageNumber} out of range (1 - ${doc.numPages})`, 400);
    }

    const page = await doc.getPage(pageNumber);
    // Scale 1.25 gives crisp reading resolution (~1100px - 1500px width)
    const viewport = page.getViewport({ scale: 1.25 });

    const cvs = canvas.createCanvas(viewport.width, viewport.height);
    const ctx = cvs.getContext("2d");

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    const pngBuffer = cvs.toBuffer("image/png");

    // Convert to web-optimized WebP (quality 85)
    const webpBuffer = await sharp(pngBuffer)
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    // Save to disk cache
    fs.writeFileSync(targetPageWebp, webpBuffer);
    logger.info({ pageNumber, bookSlug: safeSlug, sizeKb: Math.round(webpBuffer.byteLength / 1024) }, "[PageStreamingService] Rendered fresh page tile");

    // Pre-render adjacent 3 pages in background queue
    this.prefetchAdjacentPages(doc, bookOutputDir, pageNumber);

    return { filePath: targetPageWebp, buffer: webpBuffer };
  }

  /**
   * Non-blocking background pre-rendering for upcoming pages
   */
  private static prefetchAdjacentPages(doc: any, bookOutputDir: string, currentNum: number) {
    setImmediate(async () => {
      try {
        const { canvas, sharp } = await getRenderingEngines();
        const nextPages = [currentNum + 1, currentNum + 2, currentNum + 3].filter((p) => p <= doc.numPages);

        for (const p of nextPages) {
          const outPath = path.join(bookOutputDir, `page-${p}.webp`);
          if (fs.existsSync(outPath)) continue;

          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: 1.25 });
          const cvs = canvas.createCanvas(viewport.width, viewport.height);
          const ctx = cvs.getContext("2d");

          await page.render({ canvasContext: ctx, viewport }).promise;
          const pngBuffer = cvs.toBuffer("image/png");
          const webpBuffer = await sharp(pngBuffer).webp({ quality: 85 }).toBuffer();
          fs.writeFileSync(outPath, webpBuffer);
        }
      } catch (err) {
        // Non-blocking prefetch failure
      }
    });
  }
}
