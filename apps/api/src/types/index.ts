export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  image_count: number;
  odm_task_uuid: string | null;
  orthomosaic_path: string | null;
  bounds: GeoJSONPolygon | null;
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export type ProjectStatus = 'created' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface Annotation {
  id: string;
  project_id: string;
  geometry: GeoJSONGeometry;
  label: string;
  category: AnnotationCategory | null;
  notes: string | null;
  area_sqm: number | null;
  perimeter_m: number | null;
  centroid: GeoJSONPoint | null;
  created_at: Date;
  updated_at: Date;
}

export type AnnotationCategory = 'disease' | 'irrigation' | 'pest' | 'other';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateAnnotationRequest {
  geometry: GeoJSONGeometry;
  label: string;
  category?: AnnotationCategory;
  notes?: string;
}

export interface UpdateAnnotationRequest {
  label?: string;
  category?: AnnotationCategory;
  notes?: string;
}

export interface ProcessingStatus {
  status: ProjectStatus;
  progress: number;
  stage: string;
  error?: string;
}

export interface NodeODMTaskInfo {
  uuid: string;
  status: {
    code: number; // 10=queued, 20=running, 30=failed, 40=completed, 50=canceled
  };
  progress: number;
  processingTime: number;
  options: unknown[];
}
