import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';
import { query } from '../db/index.js';
import {
  createTask,
  uploadImage,
  commitTask,
  getTaskStatus,
  downloadOrthomosaic,
} from './nodeodm.js';
import { extractBoundsFromGeoTiff } from './geotiff.js';
import { ensureCog } from './cog.js';
import { generateTiles } from './tiles.js';

const POLL_INTERVAL = 10000; // 10 seconds
const MAX_POLL_TIME = 3 * 60 * 60 * 1000; // 3 hours

export async function startProcessing(projectId: string): Promise<void> {
  try {
    // Update status to processing
    await query(
      'UPDATE projects SET status = $1, processing_started_at = NOW() WHERE id = $2',
      ['processing', projectId]
    );

    // Get list of uploaded images
    const uploadDir = path.join(config.uploadsDir, projectId);
    const files = await fs.readdir(uploadDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|tiff|tif)$/i.test(f));

    if (imageFiles.length < 2) {
      throw new Error('At least 2 images are required');
    }

    console.log(`Starting processing for project ${projectId} with ${imageFiles.length} images`);

    // Create NodeODM task
    const taskUuid = await createTask();
    console.log(`Created NodeODM task: ${taskUuid}`);

    // Store task UUID
    await query(
      'UPDATE projects SET odm_task_uuid = $1 WHERE id = $2',
      [taskUuid, projectId]
    );

    // Upload all images
    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = path.join(uploadDir, imageFiles[i]);
      await uploadImage(taskUuid, imagePath);
      console.log(`Uploaded image ${i + 1}/${imageFiles.length}: ${imageFiles[i]}`);
    }

    // Commit task to start processing
    await commitTask(taskUuid);
    console.log(`Committed task ${taskUuid}, processing started`);

    // Poll for completion
    const startTime = Date.now();
    while (Date.now() - startTime < MAX_POLL_TIME) {
      await sleep(POLL_INTERVAL);

      const status = await getTaskStatus(taskUuid);
      console.log(`Task ${taskUuid} status: ${status.status}, progress: ${status.progress}%`);

      if (status.status === 40) {
        // Completed
        console.log(`Task ${taskUuid} completed, downloading orthomosaic`);
        await handleCompletion(projectId, taskUuid);
        return;
      } else if (status.status === 30) {
        // Failed
        throw new Error('NodeODM processing failed');
      } else if (status.status === 50) {
        // Canceled
        throw new Error('NodeODM processing was canceled');
      }
    }

    throw new Error('Processing timed out');
  } catch (error) {
    console.error(`Processing failed for project ${projectId}:`, error);
    await query(
      'UPDATE projects SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error instanceof Error ? error.message : 'Unknown error', projectId]
    );
  }
}

async function handleCompletion(projectId: string, taskUuid: string): Promise<void> {
  // Create output directory
  const outputDir = path.join(config.outputsDir, projectId);
  await fs.mkdir(outputDir, { recursive: true });

  // Download orthomosaic
  const orthomosaicPath = path.join(outputDir, 'orthophoto.tif');
  await downloadOrthomosaic(taskUuid, orthomosaicPath);
  console.log(`Downloaded orthomosaic to ${orthomosaicPath}`);

  // Optionally convert to COG for efficient range requests
  const { path: finalOrthoPath } = await ensureCog(orthomosaicPath);

  // Generate tiles for MapLibre rendering
  const tilesDir = path.join(outputDir, 'tiles');
  await generateTiles(finalOrthoPath, tilesDir);
  console.log(`Generated tiles at ${tilesDir}`);

  // Extract bounds from GeoTIFF
  let boundsWkt: string | null = null;
  try {
    const bounds = await extractBoundsFromGeoTiff(finalOrthoPath);
    if (bounds) {
      const { minX, minY, maxX, maxY } = bounds;
      boundsWkt = `POLYGON((${minX} ${minY}, ${maxX} ${minY}, ${maxX} ${maxY}, ${minX} ${maxY}, ${minX} ${minY}))`;
    }
  } catch (error) {
    console.error('Failed to extract bounds from GeoTIFF:', error);
  }

  // Update project status
  if (boundsWkt) {
    await query(
      `UPDATE projects SET
        status = $1,
        orthomosaic_path = $2,
        bounds = ST_SetSRID(ST_GeomFromText($3), 4326),
        processing_completed_at = NOW()
       WHERE id = $4`,
      ['ready', finalOrthoPath, boundsWkt, projectId]
    );
  } else {
    await query(
      `UPDATE projects SET
        status = $1,
        orthomosaic_path = $2,
        processing_completed_at = NOW()
       WHERE id = $3`,
      ['ready', finalOrthoPath, projectId]
    );
  }

  console.log(`Project ${projectId} processing complete`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
