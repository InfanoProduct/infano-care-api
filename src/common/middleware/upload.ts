import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './errorHandler.js';

// Ensure upload directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = (req.query.folder as string) || '';
    const targetDir = path.join(uploadDir, folder);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const originalName = path.basename(file.originalname, ext);
    // Sanitize the original name: replace spaces and special characters with dashes
    const sanitized = originalName
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const base = sanitized || 'file';
    const filename = `${base}${ext}`;
    
    const folder = (req.query.folder as string) || '';
    const targetPath = path.join(uploadDir, folder, filename);

    if (fs.existsSync(targetPath)) {
      return cb(new AppError(`A file named "${filename}" already exists.`, 400), "");
    }

    cb(null, filename);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|m4a|mp3|wav|aac|ogg|webm|mpeg|audio|video|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, audio, video, and PDF files are allowed'));
  }
};


export const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter,
});
