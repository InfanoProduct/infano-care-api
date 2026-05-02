import { Router } from "express";
import multer from "multer";
import { BlogController } from "./blog.controller.js";
import { authenticate } from "../../common/middleware/auth.js";
import { requireAdmin } from "../../common/middleware/requireAdmin.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes (for the main site)
router.get("/posts/slug/:slug", BlogController.getPostBySlug);
router.get("/posts", BlogController.getAllPosts);
router.get("/posts/:id", BlogController.getPost);
router.get("/authors", BlogController.getAuthors);
router.get("/categories", BlogController.getCategories);
router.get("/ctas", BlogController.getCTAs);

// Admin routes (require authentication and admin role)
router.use(authenticate);
router.use(requireAdmin);

// Post Management
router.post("/posts", BlogController.createPost);
router.patch("/posts/:id", BlogController.updatePost);
router.delete("/posts/:id", BlogController.deletePost);

// Stats Management
router.get("/stats", BlogController.getStats);

// Author Management
router.post("/authors", BlogController.createAuthor);
router.patch("/authors/:id", BlogController.updateAuthor);
router.delete("/authors/:id", BlogController.deleteAuthor);

// Category Management
router.post("/categories", BlogController.createCategory);
router.patch("/categories/:id", BlogController.updateCategory);
router.delete("/categories/:id", BlogController.deleteCategory);

// CTA Management
router.post("/ctas", BlogController.createCTA);
router.patch("/ctas/:id", BlogController.updateCTA);
router.delete("/ctas/:id", BlogController.deleteCTA);

// Image Upload
router.post("/upload-image", upload.single("image"), BlogController.uploadImage);

export default router;
