import { Request, Response, NextFunction } from "express";
import { BlogService } from "./blog.service.js";

export class BlogController {
  // --- Posts ---
  static async getAllPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 10;
      const search = req.query['search'] as string;
      const result = await BlogService.getAllPosts(page, limit, search);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPost(req: Request, res: Response, next: NextFunction) {
    try {
      const post = await BlogService.getPostById(req.params['id'] as string);
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  }

  static async getPostBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const post = await BlogService.getPostBySlug(req.params['slug'] as string);
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  }

  static async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const post = await BlogService.createPost(req.body);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }

  static async updatePost(req: Request, res: Response, next: NextFunction) {
    try {
      const post = await BlogService.updatePost(req.params['id'] as string, req.body);
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  }

  static async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      await BlogService.deletePost(req.params['id'] as string);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  // --- Authors ---
  static async getAuthors(_req: Request, res: Response, next: NextFunction) {
    try {
      const authors = await BlogService.getAllAuthors();
      res.status(200).json(authors);
    } catch (error) {
      next(error);
    }
  }

  static async createAuthor(req: Request, res: Response, next: NextFunction) {
    try {
      const author = await BlogService.createAuthor(req.body);
      res.status(201).json(author);
    } catch (error) {
      next(error);
    }
  }

  static async updateAuthor(req: Request, res: Response, next: NextFunction) {
    try {
      const author = await BlogService.updateAuthor(req.params['id'] as string, req.body);
      res.status(200).json(author);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAuthor(req: Request, res: Response, next: NextFunction) {
    try {
      await BlogService.deleteAuthor(req.params['id'] as string);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  // --- Categories ---
  static async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await BlogService.getAllCategories();
      res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await BlogService.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await BlogService.updateCategory(req.params['id'] as string, req.body);
      res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await BlogService.deleteCategory(req.params['id'] as string);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  // --- CTAs ---
  static async getCTAs(_req: Request, res: Response, next: NextFunction) {
    try {
      const ctas = await BlogService.getAllCTAs();
      res.status(200).json(ctas);
    } catch (error) {
      next(error);
    }
  }

  static async createCTA(req: Request, res: Response, next: NextFunction) {
    try {
      const cta = await BlogService.createCTA(req.body);
      res.status(201).json(cta);
    } catch (error) {
      next(error);
    }
  }

  static async updateCTA(req: Request, res: Response, next: NextFunction) {
    try {
      const cta = await BlogService.updateCTA(req.params['id'] as string, req.body);
      res.status(200).json(cta);
    } catch (error) {
      next(error);
    }
  }

  static async deleteCTA(req: Request, res: Response, next: NextFunction) {
    try {
      await BlogService.deleteCTA(req.params['id'] as string);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  // --- Stats ---
  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await BlogService.getStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  // --- Upload ---
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      const filename = await BlogService.uploadImage(req.file.buffer, req.file.originalname);
      
      const baseUrl = process.env.IMAGE_BASE_URL || `${req.protocol || 'http'}://${req.get('host') || ''}/uploads/blog`;
      const url = `${baseUrl}/${filename}`;

      res.status(200).json({ 
        url,
        message: "Image uploaded successfully to remote server"
      });
    } catch (error) {
      next(error);
    }
  }
}
