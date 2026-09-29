import AdmZip from "adm-zip";
import { prisma } from "../../db/client.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export interface ParsedChapter {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  summary?: string;
  contentHtml: string;
}

export interface ParsedEpubResult {
  title: string;
  author: string;
  description: string;
  totalPages: number;
  chapters: ParsedChapter[];
  coverBase64?: string;
}

export class EpubService {
  /**
   * Parse an EPUB buffer and extract metadata, cover image, and HTML chapters
   */
  static parseEpubBuffer(buffer: Buffer): ParsedEpubResult {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      // 1. Locate container.xml to find the OPF file path
      const containerEntry = zipEntries.find((e) => e.entryName === "META-INF/container.xml");
      if (!containerEntry) {
        throw new AppError("Invalid EPUB: META-INF/container.xml not found", 400);
      }

      const containerXml = containerEntry.getData().toString("utf8");
      const opfPathMatch = containerXml.match(/full-path="([^"]+)"/i);
      const opfPath = (opfPathMatch && opfPathMatch[1]) ? opfPathMatch[1] : "OEBPS/content.opf";
      const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/")) : "";

      // 2. Read OPF manifest
      const opfEntry = zipEntries.find((e) => e.entryName === opfPath);
      if (!opfEntry) {
        throw new AppError(`Invalid EPUB: OPF file not found at ${opfPath}`, 400);
      }

      const opfContent = opfEntry.getData().toString("utf8");

      // Extract metadata
      const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
      const descMatch = opfContent.match(/<dc:description[^>]*>([^<]+)<\/dc:description>/i);

      const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : "Untitled eBook";
      const author = authorMatch && authorMatch[1] ? authorMatch[1].trim() : "Infano Care";
      const description = descMatch && descMatch[1] ? descMatch[1].trim() : "An interactive eBook on the Infano Care digital platform.";

      // 3. Extract Manifest & Spine (order of reading)
      const manifestItems: Record<string, { href: string; mediaType: string }> = {};
      const itemRegex = /<item\s+[^>]*id="([^"]+)"\s+[^>]*href="([^"]+)"\s+[^>]*media-type="([^"]+)"[^>]*\/?>/gi;
      let mMatch: RegExpExecArray | null;
      while ((mMatch = itemRegex.exec(opfContent)) !== null) {
        if (mMatch[1] && mMatch[2] && mMatch[3]) {
          manifestItems[mMatch[1]] = {
            href: mMatch[2],
            mediaType: mMatch[3],
          };
        }
      }

      // Read Spine itemref order
      const spineIdrefs: string[] = [];
      const itemrefRegex = /<itemref\s+[^>]*idref="([^"]+)"[^>]*\/?>/gi;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = itemrefRegex.exec(opfContent)) !== null) {
        if (sMatch[1]) {
          spineIdrefs.push(sMatch[1]);
        }
      }

      // 4. Extract and clean Chapters HTML
      const chapters: ParsedChapter[] = [];
      let currentPage = 1;
      let chapterIdx = 1;

      for (const idref of spineIdrefs) {
        const item = manifestItems[idref];
        if (!item || !item.mediaType.includes("html")) continue;

        // Resolve entry path
        const fullHref = opfDir ? `${opfDir}/${item.href}` : item.href;
        const normalizedPath = fullHref.replace(/\\/g, "/");

        const chapterEntry = zipEntries.find(
          (e) => e.entryName === normalizedPath || e.entryName.endsWith(item.href)
        );

        if (!chapterEntry) continue;

        const rawHtml = chapterEntry.getData().toString("utf8");

        // Extract Title from <h1>, <h2>, or <title>
        const hTitleMatch = rawHtml.match(/<h[1-2][^>]*>([^<]+)<\/h[1-2]>/i) || rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        const chapterTitle = hTitleMatch && hTitleMatch[1] ? hTitleMatch[1].trim() : `Chapter ${chapterIdx}`;

        // Extract body content
        const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let contentHtml = bodyMatch && bodyMatch[1] ? bodyMatch[1] : rawHtml;

        // Clean up scripts, dangerous tags, and style tags
        contentHtml = contentHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .trim();

        if (contentHtml.length < 50) continue; // skip empty or spacer pages

        const estimatedPages = Math.max(2, Math.ceil(contentHtml.replace(/<[^>]+>/g, "").split(/\s+/).length / 250));
        const pageStart = currentPage;
        const pageEnd = currentPage + estimatedPages - 1;
        currentPage = pageEnd + 1;

        chapters.push({
          id: `ch-${chapterIdx}`,
          title: chapterTitle,
          pageStart,
          pageEnd,
          summary: `Chapter ${chapterIdx}: ${chapterTitle}`,
          contentHtml,
        });

        chapterIdx++;
      }

      // Total Pages calculation
      const totalPages = Math.max(chapters.length * 10, currentPage - 1);

      return {
        title,
        author,
        description,
        totalPages,
        chapters: chapters.length > 0 ? chapters : [
          {
            id: "ch-1",
            title: "Introduction",
            pageStart: 1,
            pageEnd: 10,
            contentHtml: "<p>Welcome to your eBook. Content parsed from upload.</p>"
          }
        ],
      };
    } catch (error: any) {
      logger.error({ error: error.message }, "[EpubService] Failed to parse EPUB file");
      throw new AppError(`EPUB parsing failed: ${error.message}`, 400);
    }
  }

  /**
   * Import or update an eBook in the database from an EPUB buffer
   */
  static async importEpubToBook(buffer: Buffer, slug = "gigi-the-book") {
    const parsed = this.parseEpubBuffer(buffer);

    let book = await prisma.book.findFirst({
      where: {
        OR: [{ slug }, { title: { contains: "Gigi", mode: "insensitive" } }]
      }
    });

    if (!book) {
      book = await prisma.book.create({
        data: {
          slug,
          title: parsed.title,
          author: parsed.author,
          description: parsed.description,
          totalPages: parsed.totalPages,
          chapters: parsed.chapters as any,
          price: 9.99,
          stock: 9999,
          isActive: true
        }
      });
      logger.info({ bookId: book.id, chaptersCount: parsed.chapters.length }, "[EpubService] Created new book from EPUB upload");
    } else {
      book = await prisma.book.update({
        where: { id: book.id },
        data: {
          title: parsed.title,
          author: parsed.author,
          description: parsed.description,
          totalPages: parsed.totalPages,
          chapters: parsed.chapters as any,
          isActive: true
        }
      });
      logger.info({ bookId: book.id, chaptersCount: parsed.chapters.length }, "[EpubService] Updated existing book with new EPUB chapters");
    }

    return book;
  }
}
