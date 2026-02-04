import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { Annotation, CreateAnnotationRequest, UpdateAnnotationRequest } from '../types/index.js';

const router: Router = Router();

// List annotations for a project
router.get('/:id/annotations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category } = req.query;

    let sql = `
      SELECT id, project_id, ST_AsGeoJSON(geometry)::json as geometry,
             label, category, notes, area_sqm, perimeter_m,
             ST_AsGeoJSON(centroid)::json as centroid,
             created_at, updated_at
      FROM annotations
      WHERE project_id = $1
    `;
    const params: unknown[] = [id];

    if (category) {
      sql += ` AND category = $2`;
      params.push(category);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query<Annotation>(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing annotations:', error);
    res.status(500).json({ error: 'Failed to list annotations' });
  }
});

// Get single annotation
router.get('/:projectId/annotations/:annotationId', async (req: Request, res: Response) => {
  try {
    const { projectId, annotationId } = req.params;
    const result = await query<Annotation>(
      `SELECT id, project_id, ST_AsGeoJSON(geometry)::json as geometry,
              label, category, notes, area_sqm, perimeter_m,
              ST_AsGeoJSON(centroid)::json as centroid,
              created_at, updated_at
       FROM annotations
       WHERE id = $1 AND project_id = $2`,
      [annotationId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting annotation:', error);
    res.status(500).json({ error: 'Failed to get annotation' });
  }
});

// Create annotation
router.post('/:id/annotations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { geometry, label, category, notes }: CreateAnnotationRequest = req.body;

    if (!geometry || !label) {
      return res.status(400).json({ error: 'Geometry and label are required' });
    }

    // Calculate area, perimeter, and centroid using PostGIS
    const geomJson = JSON.stringify(geometry);

    const result = await query<Annotation>(
      `INSERT INTO annotations (project_id, geometry, label, category, notes, area_sqm, perimeter_m, centroid)
       VALUES (
         $1,
         ST_SetSRID(ST_GeomFromGeoJSON($2), 4326),
         $3,
         $4,
         $5,
         CASE
           WHEN ST_GeometryType(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)) IN ('ST_Polygon', 'ST_MultiPolygon')
           THEN ST_Area(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 3857))
           ELSE NULL
         END,
         CASE
           WHEN ST_GeometryType(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)) IN ('ST_Polygon', 'ST_MultiPolygon', 'ST_LineString')
           THEN ST_Perimeter(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 3857))
           ELSE NULL
         END,
         ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))
       )
       RETURNING id, project_id, ST_AsGeoJSON(geometry)::json as geometry,
                 label, category, notes, area_sqm, perimeter_m,
                 ST_AsGeoJSON(centroid)::json as centroid,
                 created_at, updated_at`,
      [id, geomJson, label.trim(), category || null, notes?.trim() || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating annotation:', error);
    res.status(500).json({ error: 'Failed to create annotation' });
  }
});

// Update annotation
router.patch('/:projectId/annotations/:annotationId', async (req: Request, res: Response) => {
  try {
    const { projectId, annotationId } = req.params;
    const { label, category, notes }: UpdateAnnotationRequest = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (label !== undefined) {
      updates.push(`label = $${paramIndex++}`);
      values.push(label.trim());
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category || null);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes?.trim() || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(annotationId, projectId);
    const result = await query<Annotation>(
      `UPDATE annotations SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND project_id = $${paramIndex + 1}
       RETURNING id, project_id, ST_AsGeoJSON(geometry)::json as geometry,
                 label, category, notes, area_sqm, perimeter_m,
                 ST_AsGeoJSON(centroid)::json as centroid,
                 created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating annotation:', error);
    res.status(500).json({ error: 'Failed to update annotation' });
  }
});

// Delete annotation
router.delete('/:projectId/annotations/:annotationId', async (req: Request, res: Response) => {
  try {
    const { projectId, annotationId } = req.params;
    const result = await query(
      'DELETE FROM annotations WHERE id = $1 AND project_id = $2 RETURNING id',
      [annotationId, projectId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

export default router;
