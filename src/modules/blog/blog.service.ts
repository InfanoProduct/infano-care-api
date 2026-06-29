import { prisma } from "../../db/client.js";

export class BlogService {
  // --- Posts ---
  static async getAllPosts(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { summary: { contains: search, mode: 'insensitive' as const } },
      ],
      isDeleted: false
    } : { isDeleted: false };

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          thumbnailUrl: true,
          tags: true,
          authorId: true,
          isPublished: true,
          publishedAt: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          views: true,
          readTime: true,
          author: true,
          categories: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getPostById(id: string) {
    return prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: true,
        categories: true,
        ctas: true,
      },
    });
  }

  static async getPostBySlug(slug: string) {
    return prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: true,
        categories: true,
        ctas: true,
      },
    });
  }

  static async createPost(data: any) {
    const { categoryIds, ctaIds, authorId, seoTitle, seoDescription, seoKeywords, ...rest } = data;
    
    // Ensure unique slug
    const uniqueSlug = await this.getUniqueSlug('blogPost', rest.title, rest.slug);
    
    return prisma.blogPost.create({
      data: {
        ...rest,
        slug: uniqueSlug,
        author: authorId ? {
          connect: { id: authorId }
        } : undefined,
        categories: categoryIds ? {
          connect: categoryIds.map((id: string) => ({ id })),
        } : undefined,
        ctas: ctaIds ? {
          connect: ctaIds.map((id: string) => ({ id })),
        } : undefined,
      },
    });
  }

  static async updatePost(id: string, data: any) {
    const { categoryIds, ctaIds, authorId, seoTitle, seoDescription, seoKeywords, ...rest } = data;
    
    // Ensure unique slug if provided
    let slug = rest.slug;
    if (slug || rest.title) {
      slug = await this.getUniqueSlug('blogPost', rest.title, rest.slug, id);
    }

    return prisma.blogPost.update({
      where: { id },
      data: {
        ...rest,
        ...(slug ? { slug } : {}),
        author: authorId ? {
          connect: { id: authorId }
        } : undefined,
        categories: categoryIds ? {
          set: categoryIds.map((id: string) => ({ id })),
        } : undefined,
        ctas: ctaIds ? {
          set: ctaIds.map((id: string) => ({ id })),
        } : undefined,
      },
    });
  }

  static async deletePost(id: string) {
    return prisma.blogPost.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  static async incrementViews(id: string) {
    return prisma.blogPost.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  // --- Authors ---
  static async getAllAuthors() {
    return prisma.blogAuthor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  static async createAuthor(data: any) {
    const { instagramFollowers, facebookFollowers, linkedInFollowers, ...rest } = data;
    return prisma.blogAuthor.create({ data: rest });
  }

  static async updateAuthor(id: string, data: any) {
    const { instagramFollowers, facebookFollowers, linkedInFollowers, ...rest } = data;
    return prisma.blogAuthor.update({
      where: { id },
      data: rest,
    });
  }

  static async deleteAuthor(id: string) {
    return prisma.blogAuthor.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- Categories ---
  static async getAllCategories() {
    return prisma.blogCategory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { posts: { where: { isPublished: true } } }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createCategory(data: any) {
    const slug = await this.getUniqueSlug('blogCategory', data.name, data.slug);
    return prisma.blogCategory.create({ 
      data: {
        ...data,
        slug
      } 
    });
  }

  static async updateCategory(id: string, data: any) {
    let slug = data.slug;
    if (slug || data.name) {
      slug = await this.getUniqueSlug('blogCategory', data.name, data.slug, id);
    }
    return prisma.blogCategory.update({
      where: { id },
      data: {
        ...data,
        ...(slug ? { slug } : {})
      },
    });
  }

  static async deleteCategory(id: string) {
    return prisma.blogCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- CTAs ---
  static async getAllCTAs() {
    return prisma.blogCTA.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createCTA(data: any) {
    return prisma.blogCTA.create({ data });
  }

  static async updateCTA(id: string, data: any) {
    return prisma.blogCTA.update({
      where: { id },
      data,
    });
  }

  static async deleteCTA(id: string) {
    return prisma.blogCTA.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- Dashboard Stats ---
  static async getStats() {
    const [totalPosts, totalViews, totalCategories, totalAuthors] = await Promise.all([
      prisma.blogPost.count({ where: { isDeleted: false } }),
      prisma.blogPost.aggregate({
        _sum: { views: true },
        where: { isDeleted: false },
      }),
      prisma.blogCategory.count({ where: { isActive: true } }),
      prisma.blogAuthor.count({ where: { isActive: true } }),
    ]);

    return {
      totalPosts,
      totalViews: totalViews._sum.views || 0,
      totalCategories,
      totalAuthors,
    };
  }

  static async getGlobalStats() {
    let stats = await prisma.blogStats.findFirst();
    if (!stats) {
      stats = await prisma.blogStats.create({
        data: {},
      });
    }
    return stats;
  }

  static async updateGlobalStats(data: any) {
    const stats = await this.getGlobalStats();
    return prisma.blogStats.update({
      where: { id: stats.id },
      data,
    });
  }

  // --- Comments ---
  static async getCommentsByPostId(postId: string) {
    return prisma.blogComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createComment(postId: string, data: any) {
    const { name, email, content } = data;
    return prisma.blogComment.create({
      data: {
        postId,
        name,
        email,
        content,
      },
    });
  }

  // --- Helpers ---
  private static async getUniqueSlug(model: 'blogPost' | 'blogCategory', title: string, slug?: string, excludeId?: string) {
    let baseSlug = (slug || title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    if (!baseSlug) baseSlug = 'untitled';

    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await (prisma[model] as any).findFirst({
        where: {
          slug: uniqueSlug,
          ...(excludeId ? { id: { not: excludeId } } : {})
        },
        select: { id: true }
      });

      if (!existing) break;

      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }
}
