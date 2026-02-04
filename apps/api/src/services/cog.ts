import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

interface CogResult {
  path: string;
  converted: boolean;
}

function runGdalTranslate(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-of', 'COG',
      '-co', 'COMPRESS=DEFLATE',
      '-co', 'BIGTIFF=IF_SAFER',
      inputPath,
      outputPath,
    ];

    const child = spawn(config.gdalTranslatePath, args, { stdio: 'inherit' });

    child.on('error', (err) => reject(err));
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`gdal_translate exited with code ${code}`));
      }
    });
  });
}

export async function ensureCog(inputPath: string): Promise<CogResult> {
  if (!config.enableCog) {
    return { path: inputPath, converted: false };
  }

  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.cog.tif`);

  try {
    if (outputPath === inputPath) {
      throw new Error('COG output path matches input path; refusing to overwrite');
    }

    await runGdalTranslate(inputPath, outputPath);
    // Replace original with COG to avoid doubling storage
    await fs.rename(outputPath, inputPath);
    console.log(`COG conversion complete: ${inputPath}`);
    return { path: inputPath, converted: true };
  } catch (error) {
    console.warn('COG conversion failed, using original GeoTIFF:', error);
    // Cleanup any partial output
    await fs.unlink(outputPath).catch(() => {});
    return { path: inputPath, converted: false };
  }
}
