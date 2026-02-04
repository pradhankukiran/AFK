import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { generateGeoJSON, generateCSV, generateShapefile, AnnotationRow } from '../services/export.js';

const router: Router = Router();

// Export annotations in various formats
router.get('/:id/export/:format', async (req: Request, res: Response) => {
  try {
    const { id, format } = req.params;

    // Get project name for filename
    const projectResult = await query<{ name: string }>(
      'SELECT name FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectName = projectResult.rows[0].name.replace(/[^a-zA-Z0-9]/g, '_');

    // Get annotations with coordinates
    const result = await query<AnnotationRow>(
      `SELECT id, ST_AsGeoJSON(geometry)::json as geometry,
              label, category, notes, area_sqm, perimeter_m,
              ST_X(centroid) as longitude, ST_Y(centroid) as latitude,
              created_at
       FROM annotations
       WHERE project_id = $1
       ORDER BY created_at`,
      [id]
    );

    const annotations = result.rows;

    if (annotations.length === 0) {
      return res.status(404).json({ error: 'No annotations to export' });
    }

    switch (format.toLowerCase()) {
      case 'geojson': {
        const geojson = generateGeoJSON(annotations);
        res.setHeader('Content-Type', 'application/geo+json');
        res.setHeader('Content-Disposition', `attachment; filename="${projectName}_annotations.geojson"`);
        res.json(geojson);
        break;
      }

      case 'csv': {
        const csv = generateCSV(annotations);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${projectName}_annotations.csv"`);
        res.send(csv);
        break;
      }

      case 'shapefile':
      case 'shp': {
        const shpBuffer = await generateShapefile(annotations);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${projectName}_annotations.zip"`);
        res.send(shpBuffer);
        break;
      }

      default:
        res.status(400).json({
          error: 'Invalid format',
          supportedFormats: ['geojson', 'csv', 'shapefile'],
        });
    }
  } catch (error) {
    console.error('Error exporting annotations:', error);
    res.status(500).json({ error: 'Failed to export annotations' });
  }
});

export default router;
