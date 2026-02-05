import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { pool } from './db/index.js';
import projectsRouter from './routes/projects.js';
import imagesRouter from './routes/images.js';
import annotationsRouter from './routes/annotations.js';
import exportRouter from './routes/export.js';

const app = express();

// 1x1 transparent PNG (expanded to 256x256 by the browser)
// This is the smallest valid transparent PNG
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Middleware
app.use(cors());
app.use(express.json());

// Serve orthomosaics statically, with transparent PNG fallback for missing tiles
app.use('/outputs', express.static(config.outputsDir), (req, res, next) => {
  // If static file not found and it's a tile request, return transparent PNG
  if (req.path.match(/\/tiles\/\d+\/\d+\/\d+\.png$/)) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    return res.send(TRANSPARENT_PNG);
  }
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/projects', imagesRouter);
app.use('/api/projects', annotationsRouter);
app.use('/api/projects', exportRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`AFK API server running on port ${config.port}`);
  console.log(`NodeODM URL: ${config.nodeOdmUrl}`);
  console.log(`Uploads directory: ${config.uploadsDir}`);
  console.log(`Outputs directory: ${config.outputsDir}`);
});
