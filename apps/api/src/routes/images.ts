import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';
import { query } from '../db/index.js';
import { Project } from '../types/index.js';
import { startProcessing } from '../services/processing.js';

const router: Router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const projectId = req.params.id;
    const uploadDir = path.join(config.uploadsDir, projectId);
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename but sanitize it
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, sanitized);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and TIFF are allowed.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
    files: config.maxFiles,
  },
});

// Upload images to a project
router.post('/:id/images', upload.array('images', config.maxFiles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Verify project exists and is in valid state
    const projectResult = await query<Project>(
      'SELECT id, status FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      // Clean up uploaded files
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];
    if (!['created', 'uploading'].includes(project.status)) {
      // Clean up uploaded files since project is in invalid state
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
      return res.status(400).json({
        error: 'Cannot upload images to a project that is already processing or completed',
      });
    }

    // Update project with image count
    const uploadDir = path.join(config.uploadsDir, id);
    const allFiles = await fs.readdir(uploadDir);
    const imageFiles = allFiles.filter(f => /\.(jpg|jpeg|png|tiff|tif)$/i.test(f));

    await query(
      'UPDATE projects SET status = $1, image_count = $2 WHERE id = $3',
      ['uploading', imageFiles.length, id]
    );

    res.json({
      message: 'Images uploaded successfully',
      uploaded: files.length,
      total: imageFiles.length,
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// List images in a project
router.get('/:id/images', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const uploadDir = path.join(config.uploadsDir, id);

    try {
      const files = await fs.readdir(uploadDir);
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|tiff|tif)$/i.test(f));

      const images = await Promise.all(
        imageFiles.map(async (filename) => {
          const filePath = path.join(uploadDir, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            size: stats.size,
            uploadedAt: stats.mtime,
          };
        })
      );

      res.json(images);
    } catch {
      // Directory doesn't exist yet
      res.json([]);
    }
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// Start processing (submit to NodeODM)
router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify project exists and has images
    const projectResult = await query<Project>(
      'SELECT id, status, image_count FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];
    if (project.status === 'processing') {
      return res.status(400).json({ error: 'Project is already processing' });
    }
    if (project.status === 'ready') {
      return res.status(400).json({ error: 'Project has already been processed' });
    }
    if (project.image_count < 2) {
      return res.status(400).json({ error: 'At least 2 images are required for processing' });
    }

    // Start processing in background
    startProcessing(id).catch(error => {
      console.error(`Processing failed for project ${id}:`, error);
    });

    res.json({ message: 'Processing started', projectId: id });
  } catch (error) {
    console.error('Error starting processing:', error);
    res.status(500).json({ error: 'Failed to start processing' });
  }
});

// Serve orthomosaic file
router.get('/:id/orthomosaic', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query<Project>(
      'SELECT orthomosaic_path, status FROM projects WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = result.rows[0];
    if (project.status !== 'ready' || !project.orthomosaic_path) {
      return res.status(404).json({ error: 'Orthomosaic not available' });
    }

    res.sendFile(project.orthomosaic_path);
  } catch (error) {
    console.error('Error serving orthomosaic:', error);
    res.status(500).json({ error: 'Failed to serve orthomosaic' });
  }
});

export default router;
