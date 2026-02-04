import { fromFile } from 'geotiff';
import proj4 from 'proj4';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GeoTiffInfo {
  width: number;
  height: number;
  bounds: Bounds | null;
  boundsWgs84: Bounds | null;
  crs: string | null;
  resolution: { x: number; y: number } | null;
}

// Common UTM zone definitions for proj4
// NodeODM typically outputs in UTM
function getUtmProjection(zone: number, isNorth: boolean): string {
  const hemisphere = isNorth ? '+north' : '+south';
  return `+proj=utm +zone=${zone} ${hemisphere} +datum=WGS84 +units=m +no_defs`;
}

// Register common projections
function registerProjection(epsgCode: number): string | null {
  // WGS84 - no transformation needed
  if (epsgCode === 4326) {
    return 'EPSG:4326';
  }

  // UTM North zones (32601-32660)
  if (epsgCode >= 32601 && epsgCode <= 32660) {
    const zone = epsgCode - 32600;
    const projString = getUtmProjection(zone, true);
    proj4.defs(`EPSG:${epsgCode}`, projString);
    return `EPSG:${epsgCode}`;
  }

  // UTM South zones (32701-32760)
  if (epsgCode >= 32701 && epsgCode <= 32760) {
    const zone = epsgCode - 32700;
    const projString = getUtmProjection(zone, false);
    proj4.defs(`EPSG:${epsgCode}`, projString);
    return `EPSG:${epsgCode}`;
  }

  // Web Mercator
  if (epsgCode === 3857) {
    proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs');
    return 'EPSG:3857';
  }

  return null;
}

// Extract EPSG code from GeoTIFF
function extractEpsgCode(image: any): number | null {
  try {
    const geoKeys = image.getGeoKeys();
    if (!geoKeys) return null;

    // ProjectedCSTypeGeoKey (3072) contains EPSG code for projected CRS
    if (geoKeys.ProjectedCSTypeGeoKey) {
      return geoKeys.ProjectedCSTypeGeoKey;
    }

    // GeographicTypeGeoKey (2048) contains EPSG code for geographic CRS
    if (geoKeys.GeographicTypeGeoKey) {
      return geoKeys.GeographicTypeGeoKey;
    }

    return null;
  } catch {
    return null;
  }
}

// Reproject bounds from source CRS to WGS84
function reprojectBoundsToWgs84(bounds: Bounds, sourceCrs: string): Bounds | null {
  if (sourceCrs === 'EPSG:4326') {
    return bounds;
  }

  try {
    const transformer = proj4(sourceCrs, 'EPSG:4326');

    // Transform all four corners (not just min/max) because rotation might occur
    const corners = [
      [bounds.minX, bounds.minY],
      [bounds.maxX, bounds.minY],
      [bounds.maxX, bounds.maxY],
      [bounds.minX, bounds.maxY],
    ];

    const transformedCorners = corners.map(([x, y]) => transformer.forward([x, y]));

    const lons = transformedCorners.map(c => c[0]);
    const lats = transformedCorners.map(c => c[1]);

    return {
      minX: Math.min(...lons),
      minY: Math.min(...lats),
      maxX: Math.max(...lons),
      maxY: Math.max(...lats),
    };
  } catch (error) {
    console.error('Error reprojecting bounds:', error);
    return null;
  }
}

// Check if bounds look like WGS84 (lat/lon)
function looksLikeWgs84(bounds: Bounds): boolean {
  return (
    bounds.minX >= -180 && bounds.maxX <= 180 &&
    bounds.minY >= -90 && bounds.maxY <= 90
  );
}

export async function extractBoundsFromGeoTiff(filePath: string): Promise<Bounds | null> {
  const info = await getGeoTiffInfo(filePath);
  return info.boundsWgs84;
}

export async function getGeoTiffInfo(filePath: string): Promise<GeoTiffInfo> {
  const tiff = await fromFile(filePath);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();

  const bbox = image.getBoundingBox();
  const bounds = bbox ? {
    minX: bbox[0],
    minY: bbox[1],
    maxX: bbox[2],
    maxY: bbox[3],
  } : null;

  const resolution = image.getResolution();
  const resolutionData = resolution ? { x: resolution[0], y: resolution[1] } : null;

  // Try to extract and handle CRS
  let crs: string | null = null;
  let boundsWgs84: Bounds | null = null;

  const epsgCode = extractEpsgCode(image);

  if (epsgCode) {
    crs = registerProjection(epsgCode);
    console.log(`GeoTIFF CRS detected: EPSG:${epsgCode}`);

    if (crs && bounds) {
      boundsWgs84 = reprojectBoundsToWgs84(bounds, crs);
      if (boundsWgs84) {
        console.log(`Reprojected bounds to WGS84: [${boundsWgs84.minX}, ${boundsWgs84.minY}, ${boundsWgs84.maxX}, ${boundsWgs84.maxY}]`);
      }
    }
  } else if (bounds) {
    // No CRS detected - check if bounds look like WGS84
    if (looksLikeWgs84(bounds)) {
      console.log('No CRS in GeoTIFF, but bounds look like WGS84');
      crs = 'EPSG:4326';
      boundsWgs84 = bounds;
    } else {
      console.warn('No CRS detected and bounds do not look like WGS84. Map placement may be incorrect.');
      console.warn(`Raw bounds: [${bounds.minX}, ${bounds.minY}, ${bounds.maxX}, ${bounds.maxY}]`);
      // Return raw bounds as fallback - might be wrong but better than nothing
      boundsWgs84 = bounds;
    }
  }

  return { width, height, bounds, boundsWgs84, crs, resolution: resolutionData };
}

// Legacy function for backward compatibility
export async function getGeoTiffMetadata(filePath: string): Promise<{
  width: number;
  height: number;
  bounds: Bounds | null;
  resolution: { x: number; y: number } | null;
}> {
  const info = await getGeoTiffInfo(filePath);
  return {
    width: info.width,
    height: info.height,
    bounds: info.boundsWgs84, // Return WGS84 bounds
    resolution: info.resolution,
  };
}
