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

export interface ParsedEbookResult {
  title: string;
  author: string;
  description: string;
  totalPages: number;
  chapters: ParsedChapter[];
  coverBase64?: string;
  formatDetected: "EPUB" | "KPF" | "ZIP_ARCHIVE";
}

// Backwards-compatible interface alias
export type ParsedEpubResult = ParsedEbookResult;

export class EbookService {
  /**
   * Helper to convert zip image assets into Base64 data URIs
   */
  private static getMimeTypeFromExt(ext: string): string {
    const cleanExt = ext.toLowerCase().replace(/^\./, "");
    switch (cleanExt) {
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "webp":
        return "image/webp";
      case "svg":
        return "image/svg+xml";
      case "gif":
        return "image/gif";
      default:
        return "image/jpeg";
    }
  }

  /**
   * Replace relative image src references in HTML with inline Base64 data URIs
   */
  private static inlineHtmlImages(html: string, zipEntries: AdmZip.IZipEntry[], basePath = ""): string {
    return html.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
      if (src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://")) {
        return match;
      }

      // Clean relative path
      const cleanSrc = src.replace(/^(\.\/|\.\.\/)+/, "").replace(/\\/g, "/");
      const filename = cleanSrc.split("/").pop() || cleanSrc;

      // Find matching entry in zip
      const imgEntry = zipEntries.find((e) => {
        const entryName = e.entryName.replace(/\\/g, "/");
        return (
          entryName === cleanSrc ||
          entryName.endsWith("/" + cleanSrc) ||
          entryName.endsWith("/" + filename) ||
          entryName === filename
        );
      });

      if (imgEntry) {
        const ext = filename.split(".").pop() || "jpg";
        const mime = this.getMimeTypeFromExt(ext);
        const base64 = imgEntry.getData().toString("base64");
        return `<img${before}src="data:${mime};base64,${base64}"${after}>`;
      }

      return match;
    });
  }

  /**
   * Natural sort comparator for filenames (e.g. page_1, page_2, page_10)
   */
  private static naturalSort(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  }

  /**
   * Parse an EPUB buffer (standard IDPF EPUB format)
   */
  private static parseStandardEpub(zip: AdmZip, zipEntries: AdmZip.IZipEntry[]): ParsedEbookResult {
    // 1. Locate container.xml to find the OPF file path
    const containerEntry = zipEntries.find((e) => e.entryName === "META-INF/container.xml");
    if (!containerEntry) {
      throw new AppError("Invalid EPUB: META-INF/container.xml not found", 400);
    }

    const containerXml = containerEntry.getData().toString("utf8");
    const opfPathMatch = containerXml.match(/full-path="([^"]+)"/i);
    const opfPath = opfPathMatch && opfPathMatch[1] ? opfPathMatch[1] : "OEBPS/content.opf";
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

      let rawHtml = chapterEntry.getData().toString("utf8");

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

      // Inline images from zip
      contentHtml = this.inlineHtmlImages(contentHtml, zipEntries, opfDir);

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
      formatDetected: "EPUB"
    };
  }

  /**
   * Parse Amazon Kindle Package Format (.kpf) archive
   */
  private static parseKpfBuffer(zip: AdmZip, zipEntries: AdmZip.IZipEntry[]): ParsedEbookResult {
    let title = "Gigi: The Awkward Age";
    let author = "Infano Care";
    let description = "An interactive digital eBook on the Infano Care cloud reader.";

    // 1. Inspect metadata files (book.kdf, metadata.json, book.json)
    const kdfEntry = zipEntries.find((e) => e.entryName === "book.kdf" || e.entryName.endsWith("/book.kdf"));
    const metaEntry = zipEntries.find((e) => e.entryName === "metadata.json" || e.entryName.endsWith("/metadata.json"));

    let kdfJson: any = null;
    if (kdfEntry) {
      try {
        const raw = kdfEntry.getData().toString("utf8");
        kdfJson = JSON.parse(raw);
      } catch {
        // kdf might have binary header or text
      }
    } else if (metaEntry) {
      try {
        const raw = metaEntry.getData().toString("utf8");
        kdfJson = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    if (kdfJson) {
      if (kdfJson.metadata?.title || kdfJson.title) {
        title = kdfJson.metadata?.title || kdfJson.title;
      }
      if (kdfJson.metadata?.author || kdfJson.metadata?.authors?.[0] || kdfJson.author) {
        author = kdfJson.metadata?.author || (Array.isArray(kdfJson.metadata?.authors) ? kdfJson.metadata.authors.join(", ") : kdfJson.author);
      }
      if (kdfJson.metadata?.description || kdfJson.description) {
        description = kdfJson.metadata?.description || kdfJson.description;
      }
    }

    // 2. Search for HTML/XHTML entries (Reflowable KPF)
    const htmlEntries = zipEntries.filter((e) => {
      const name = e.entryName.toLowerCase();
      return (
        !e.isDirectory &&
        (name.endsWith(".html") || name.endsWith(".xhtml") || name.endsWith(".htm")) &&
        !name.includes("__macosx")
      );
    });

    const chapters: ParsedChapter[] = [];
    let currentPage = 1;
    let chapterIdx = 1;

    if (htmlEntries.length > 0) {
      // Sort HTML files in natural order (chapter 1, chapter 2, section 1, section 2, etc.)
      htmlEntries.sort((a, b) => this.naturalSort(a.entryName, b.entryName));

      for (const entry of htmlEntries) {
        let rawHtml = entry.getData().toString("utf8");

        // Extract Title from <h1>, <h2>, or <title>
        const hTitleMatch =
          rawHtml.match(/<h[1-2][^>]*>([^<]+)<\/h[1-2]>/i) ||
          rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        
        let chapterTitle = hTitleMatch && hTitleMatch[1] ? hTitleMatch[1].trim() : "";
        if (!chapterTitle) {
          const basename = entry.name.replace(/\.[^/.]+$/, "");
          chapterTitle = basename.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        }

        // Extract body content
        const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let contentHtml = bodyMatch && bodyMatch[1] ? bodyMatch[1] : rawHtml;

        // Clean scripts and styles
        contentHtml = contentHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .trim();

        // Inline images from archive
        contentHtml = this.inlineHtmlImages(contentHtml, zipEntries);

        if (contentHtml.length < 30) continue; // Skip empty files

        const words = contentHtml.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
        const estimatedPages = Math.max(1, Math.ceil(words / 250));
        const pageStart = currentPage;
        const pageEnd = currentPage + estimatedPages - 1;
        currentPage = pageEnd + 1;

        chapters.push({
          id: `ch-${chapterIdx}`,
          title: chapterTitle || `Chapter ${chapterIdx}`,
          pageStart,
          pageEnd,
          summary: `Chapter ${chapterIdx}: ${chapterTitle || `Section ${chapterIdx}`}`,
          contentHtml,
        });

        chapterIdx++;
      }
    }

    // 3. Fallback: If no HTML files exist, check if KPF is a Fixed-Layout (Comic / Illustrated / Print-Replica) book with page images
    if (chapters.length === 0) {
      const imageEntries = zipEntries.filter((e) => {
        const name = e.entryName.toLowerCase();
        return (
          !e.isDirectory &&
          (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp") || name.endsWith(".svg")) &&
          !name.includes("__macosx") &&
          !name.includes("thumbnail")
        );
      });

      if (imageEntries.length > 0) {
        imageEntries.sort((a, b) => this.naturalSort(a.entryName, b.entryName));

        for (let i = 0; i < imageEntries.length; i++) {
          const imgEntry = imageEntries[i];
          if (!imgEntry) continue;
          const ext = imgEntry.name.split(".").pop() || "jpg";
          const mime = this.getMimeTypeFromExt(ext);
          const base64 = imgEntry.getData().toString("base64");
          const pageNum = i + 1;

          const contentHtml = `
            <div class="kpf-fixed-page flex flex-col items-center justify-center p-4 my-2 text-center">
              <img src="data:${mime};base64,${base64}" alt="Page ${pageNum}" class="max-w-full h-auto rounded-2xl shadow-xl border border-slate-200/50 mx-auto transition hover:scale-[1.01]" style="max-height: 85vh; object-fit: contain;" />
              <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4">Page ${pageNum}</p>
            </div>
          `.trim();

          chapters.push({
            id: `page-${pageNum}`,
            title: `Page ${pageNum}`,
            pageStart: pageNum,
            pageEnd: pageNum,
            summary: `Visual Page ${pageNum}`,
            contentHtml,
          });
        }
        currentPage = imageEntries.length + 1;
      }
    }

    // 4. Fallback if still empty: generate a default welcoming chapter
    if (chapters.length === 0) {
      chapters.push({
        id: "ch-1",
        title: "Introduction",
        pageStart: 1,
        pageEnd: 10,
        summary: "Introduction & Overview",
        contentHtml: `<div class="p-6 text-slate-800"><h2 class="text-2xl font-bold mb-4">${title}</h2><p>Welcome to your interactive Kindle eBook on Infano Care.</p></div>`,
      });
    }

    const totalPages = Math.max(chapters.length, currentPage - 1);

    return {
      title,
      author,
      description,
      totalPages,
      chapters,
      formatDetected: "KPF",
    };
  }

  /**
   * Universal eBook Parser: Supports EPUB, Amazon KPF, and zipped eBook packages
   */
  static parseEbookBuffer(buffer: Buffer): ParsedEbookResult {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      if (!zipEntries || zipEntries.length === 0) {
        throw new AppError("The uploaded eBook file is empty or corrupted.", 400);
      }

      // Check if it's a standard EPUB with container.xml
      const hasEpubContainer = zipEntries.some((e) => e.entryName === "META-INF/container.xml");
      if (hasEpubContainer) {
        logger.info("[EbookService] Detected standard EPUB structure");
        return this.parseStandardEpub(zip, zipEntries);
      }

      // Otherwise parse as Amazon KPF / Generic eBook archive
      logger.info("[EbookService] Parsing file as Amazon KPF / eBook archive");
      return this.parseKpfBuffer(zip, zipEntries);
    } catch (error: any) {
      logger.error({ error: error.message }, "[EbookService] Failed to parse eBook file");
      throw new AppError(`eBook parsing failed: ${error.message}`, 400);
    }
  }

  /**
   * Import or update an eBook in the database from an EPUB/KPF buffer
   */
  static async importEbookToBook(buffer: Buffer, slug = "gigi-the-book") {
    const parsed = this.parseEbookBuffer(buffer);

    let book = await prisma.book.findFirst({
      where: {
        OR: [{ slug }, { title: { contains: "Gigi", mode: "insensitive" } }],
      },
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
          isActive: true,
        },
      });
      logger.info(
        { bookId: book.id, format: parsed.formatDetected, chaptersCount: parsed.chapters.length },
        "[EbookService] Created new book from eBook upload"
      );
    } else {
      book = await prisma.book.update({
        where: { id: book.id },
        data: {
          title: parsed.title,
          author: parsed.author,
          description: parsed.description,
          totalPages: parsed.totalPages,
          chapters: parsed.chapters as any,
          isActive: true,
        },
      });
      logger.info(
        { bookId: book.id, format: parsed.formatDetected, chaptersCount: parsed.chapters.length },
        "[EbookService] Updated existing book with new eBook chapters"
      );
    }

    return {
      book,
      formatDetected: parsed.formatDetected,
      chaptersCount: parsed.chapters.length,
      totalPages: parsed.totalPages,
    };
  }

  // Alias for backward compatibility
  static parseEpubBuffer(buffer: Buffer): ParsedEbookResult {
    return this.parseEbookBuffer(buffer);
  }

  // Alias for backward compatibility
  static async importEpubToBook(buffer: Buffer, slug = "gigi-the-book") {
    const res = await this.importEbookToBook(buffer, slug);
    return res.book;
  }
}

// Backward-compatible alias export
export const EpubService = EbookService;
