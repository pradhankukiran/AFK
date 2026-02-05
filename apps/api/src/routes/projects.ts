import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';
import { Project, CreateProjectRequest, ProcessingStatus } from '../types/index.js';
import { getTaskStatus } from '../services/nodeodm.js';

const router: Router = Router();

// List all projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query<Project>(
      `SELECT id, name, description, status, image_count,
              orthomosaic_path, ST_AsGeoJSON(bounds)::json as bounds,
              processing_started_at, processing_completed_at,
              created_at, updated_at
       FROM projects
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// Get single project
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query<Project>(
      `SELECT id, name, description, status, image_count,
              odm_task_uuid, orthomosaic_path,
              ST_AsGeoJSON(bounds)::json as bounds,
              processing_started_at, processing_completed_at,
              error_message, created_at, updated_at
       FROM projects
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = result.rows[0] as Project & {
      tile_min_zoom?: number;
      tile_max_zoom?: number;
      tile_best_zoom?: number;
    };

    if (project.status === 'ready') {
      const tilesDir = path.join(config.outputsDir, project.id, 'tiles');
      const tileZoomRange = await getTileZoomRange(tilesDir);
      if (tileZoomRange) {
        project.tile_min_zoom = tileZoomRange.min;
        project.tile_max_zoom = tileZoomRange.max;
        project.tile_best_zoom = tileZoomRange.best;
      }
    }

    res.json(project);
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

async function getTileZoomRange(
  tilesDir: string
): Promise<{ min: number; max: number; best: number } | null> {
  try {
    const entries = await fs.readdir(tilesDir, { withFileTypes: true });
    const zoomLevels = entries
      .filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name))
      .map(entry => Number(entry.name))
      .sort((a, b) => a - b);

    if (zoomLevels.length === 0) return null;

    const validZooms: number[] = [];
    let bestZoom = zoomLevels[0];
    let bestSize = -1;
    const sizeThreshold = 2048;

    for (const zoom of zoomLevels) {
      const zoomDir = path.join(tilesDir, String(zoom));
      const xDirs = await fs.readdir(zoomDir, { withFileTypes: true });
      let hasData = false;
      let maxSizeForZoom = -1;

      for (const xDir of xDirs) {
        if (!xDir.isDirectory()) continue;
        const xPath = path.join(zoomDir, xDir.name);
        const yFiles = await fs.readdir(xPath, { withFileTypes: true });

        for (const yFile of yFiles) {
          if (!yFile.isFile() || !yFile.name.endsWith('.png')) continue;
          const filePath = path.join(xPath, yFile.name);
          const stats = await fs.stat(filePath);
          if (stats.size > maxSizeForZoom) {
            maxSizeForZoom = stats.size;
          }
          if (stats.size > sizeThreshold) {
            hasData = true;
          }
        }
      }

      if (hasData) {
        validZooms.push(zoom);
      }
      if (maxSizeForZoom > bestSize) {
        bestSize = maxSizeForZoom;
        bestZoom = zoom;
      }
    }

    if (validZooms.length === 0) {
      if (bestSize > -1) {
        return { min: zoomLevels[0], max: zoomLevels[zoomLevels.length - 1], best: bestZoom };
      }
      return null;
    }

    if (!validZooms.includes(bestZoom)) {
      bestZoom = validZooms[validZooms.length - 1];
    }

    return { min: validZooms[0], max: validZooms[validZooms.length - 1], best: bestZoom };
  } catch (error) {
    console.warn('Failed to determine tile zoom range:', error);
    return null;
  }
}

// Create new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description }: CreateProjectRequest = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await query<Project>(
      `INSERT INTO projects (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, status, image_count, created_at`,
      [name.trim(), description?.trim() || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (typeof name !== 'string') {
        return res.status(400).json({ error: 'Project name must be a string' });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description?.trim() || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);
    const result = await query<Project>(
      `UPDATE projects SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, status, image_count, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get processing status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query<Project>(
      `SELECT status, odm_task_uuid, error_message
       FROM projects WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = result.rows[0];
    let response: ProcessingStatus = {
      status: project.status,
      progress: 0,
      stage: 'Unknown',
    };

    if (project.status === 'ready') {
      response = { status: 'ready', progress: 100, stage: 'Complete' };
    } else if (project.status === 'failed') {
      response = {
        status: 'failed',
        progress: 0,
        stage: 'Failed',
        error: project.error_message || undefined,
      };
    } else if (project.status === 'processing' && project.odm_task_uuid) {
      try {
        const odmStatus = await getTaskStatus(project.odm_task_uuid);
        const stageMap: Record<number, string> = {
          10: 'Queued',
          20: 'Processing',
          30: 'Failed',
          40: 'Completed',
          50: 'Canceled',
        };
        response = {
          status: project.status,
          progress: odmStatus.progress,
          stage: stageMap[odmStatus.status] || 'Processing',
        };
      } catch {
        response = { status: project.status, progress: 0, stage: 'Checking...' };
      }
    } else if (project.status === 'uploading') {
      response = { status: 'uploading', progress: 0, stage: 'Uploading images' };
    } else {
      response = { status: project.status, progress: 0, stage: 'Created' };
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
