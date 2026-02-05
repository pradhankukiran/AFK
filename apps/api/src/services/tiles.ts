import { spawn } from 'child_process';
import fs from 'fs/promises';
import { config } from '../config.js';

export async function generateTiles(inputPath: string, outputDir: string): Promise<void> {
  if (!config.enableTiles) return;

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const args = [
    '-p', 'mercator',
    '-z', config.tileZoomRange,
    '--xyz',
    '-w', 'none',
    inputPath,
    outputDir,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(config.gdal2tilesPath, args, { stdio: 'inherit' });

    child.on('error', (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        reject(new Error(`gdal2tiles not found at "${config.gdal2tilesPath}". Install GDAL or set GDAL2TILES.`));
        return;
      }
      reject(err);
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`gdal2tiles exited with code ${code}`));
      }
    });
  });
}
