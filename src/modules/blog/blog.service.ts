import { prisma } from "../../db/client.js";
import { uploadToSftp } from "./sftp.js";
import streamifier from "streamifier";

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
        include: {
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
    return prisma.blogPost.create({
      data: {
        ...rest,
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
    return prisma.blogPost.update({
      where: { id },
      data: {
        ...rest,
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

  // --- Authors ---
  static async getAllAuthors() {
    return prisma.blogAuthor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  static async createAuthor(data: any) {
    return prisma.blogAuthor.create({ data });
  }

  static async updateAuthor(id: string, data: any) {
    return prisma.blogAuthor.update({
      where: { id },
      data,
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
    return prisma.blogCategory.create({ data });
  }

  static async updateCategory(id: string, data: any) {
    return prisma.blogCategory.update({
      where: { id },
      data,
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

  // --- SFTP Upload ---
  static async uploadImage(buffer: Buffer, originalName: string = "image.jpg"): Promise<string> {
    return uploadToSftp(buffer, originalName);
  }
}
