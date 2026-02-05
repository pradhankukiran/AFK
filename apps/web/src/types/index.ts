export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  image_count: number;
  orthomosaic_path: string | null;
  bounds: GeoJSON.Polygon | null;
  tile_min_zoom?: number;
  tile_max_zoom?: number;
  tile_best_zoom?: number;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'created' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface Annotation {
  id: string;
  project_id: string;
  geometry: GeoJSON.Geometry;
  label: string;
  category: AnnotationCategory | null;
  notes: string | null;
  area_sqm: number | null;
  perimeter_m: number | null;
  centroid: GeoJSON.Point | null;
  created_at: string;
  updated_at: string;
}

export type AnnotationCategory = 'disease' | 'irrigation' | 'pest' | 'other';

export interface ProcessingStatus {
  status: ProjectStatus;
  progress: number;
  stage: string;
  error?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateAnnotationRequest {
  geometry: GeoJSON.Geometry;
  label: string;
  category?: AnnotationCategory;
  notes?: string;
}
