import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config.js';
import { pool } from './db/index.js';
import projectsRouter from './routes/projects.js';
import imagesRouter from './routes/images.js';
import annotationsRouter from './routes/annotations.js';
import exportRouter from './routes/export.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve orthomosaics statically
app.use('/outputs', express.static(config.outputsDir));

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
