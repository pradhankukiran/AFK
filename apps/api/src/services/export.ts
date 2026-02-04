import * as shpwrite from '@mapbox/shp-write';

interface AnnotationRow {
  id: string;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  label: string;
  category: string | null;
  notes: string | null;
  area_sqm: number | null;
  perimeter_m: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: {
      type: string;
      coordinates: unknown;
    };
  }>;
}

export function generateGeoJSON(annotations: AnnotationRow[]): GeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: annotations.map(annotation => ({
      type: 'Feature' as const,
      properties: {
        id: annotation.id,
        label: annotation.label,
        category: annotation.category,
        notes: annotation.notes,
        area_sqm: annotation.area_sqm,
        perimeter_m: annotation.perimeter_m,
        created_at: annotation.created_at.toISOString(),
      },
      geometry: annotation.geometry,
    })),
  };
}

export function generateCSV(annotations: AnnotationRow[]): string {
  const headers = ['label', 'category', 'latitude', 'longitude', 'area_sqm', 'perimeter_m', 'notes', 'created_at'];
  const rows = annotations.map(annotation => [
    escapeCSV(annotation.label),
    escapeCSV(annotation.category || ''),
    annotation.latitude?.toFixed(6) || '',
    annotation.longitude?.toFixed(6) || '',
    annotation.area_sqm?.toFixed(2) || '',
    annotation.perimeter_m?.toFixed(2) || '',
    escapeCSV(annotation.notes || ''),
    annotation.created_at.toISOString(),
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function generateShapefile(annotations: AnnotationRow[]): Promise<Buffer> {
  const geojson = generateGeoJSON(annotations);

  // shpwrite returns a zip containing .shp, .shx, .dbf, .prj files
  const options = {
    folder: 'annotations',
    outputType: 'blob' as const,
    compression: 'DEFLATE' as const,
    types: {
      point: 'points',
      polygon: 'polygons',
      polyline: 'lines',
    },
  };

  const zipData = await shpwrite.zip(geojson, options);

  // Convert Blob to Buffer
  if (zipData instanceof Blob) {
    const arrayBuffer = await zipData.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  // Handle other types
  if (zipData instanceof ArrayBuffer) {
    return Buffer.from(zipData);
  }
  if (Buffer.isBuffer(zipData)) {
    return zipData;
  }
  // Fallback for Uint8Array or similar
  return Buffer.from(zipData as ArrayLike<number>);
}

export type { AnnotationRow };
