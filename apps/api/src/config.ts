import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://afk:afk_dev_password@localhost:5432/afk',
  nodeOdmUrl: process.env.NODEODM_URL || 'http://localhost:3000',
  enableCog: process.env.ENABLE_COG === 'true',
  gdalTranslatePath: process.env.GDAL_TRANSLATE || 'gdal_translate',
  enableTiles: process.env.ENABLE_TILES !== 'false',
  gdal2tilesPath: process.env.GDAL2TILES || 'gdal2tiles.py',
  tileZoomRange: process.env.TILE_ZOOM_RANGE || '14-22',

  // File paths
  uploadsDir: path.resolve(__dirname, '../../../uploads'),
  outputsDir: path.resolve(__dirname, '../../../outputs'),

  // Upload limits
  maxFileSize: 100 * 1024 * 1024, // 100MB per file
  maxFiles: 500,
};
