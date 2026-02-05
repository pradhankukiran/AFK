import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import { config } from '../config.js';

const client = axios.create({
  baseURL: config.nodeOdmUrl,
  timeout: 30000,
});

export interface TaskStatusResponse {
  status: number;
  progress: number;
}

export async function checkNodeODMHealth(): Promise<boolean> {
  try {
    const res = await client.get('/info');
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function createTask(): Promise<string> {
  const res = await client.post('/task/new/init');
  return res.data.uuid;
}

export async function uploadImage(taskUuid: string, imagePath: string): Promise<void> {
  const form = new FormData();
  form.append('images', fs.createReadStream(imagePath));

  await client.post(`/task/new/upload/${taskUuid}`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 120000, // 2 minutes for large files
  });
}

export async function commitTask(taskUuid: string, options?: Record<string, unknown>): Promise<void> {
  const form = new FormData();

  // Default options for orthomosaic generation
  const defaultOptions = [
    { name: 'dsm', value: true },
    { name: 'orthophoto-resolution', value: 5 }, // 5 cm/pixel
    { name: 'fast-orthophoto', value: true },
    ...Object.entries(options || {}).map(([name, value]) => ({ name, value })),
  ];

  form.append('options', JSON.stringify(defaultOptions));

  await client.post(`/task/new/commit/${taskUuid}`, form, {
    headers: form.getHeaders(),
  });
}

export async function getTaskStatus(taskUuid: string): Promise<TaskStatusResponse> {
  const res = await client.get(`/task/${taskUuid}/info`);
  return {
    status: res.data.status.code,
    progress: res.data.progress || 0,
  };
}

export async function downloadOrthomosaic(taskUuid: string, outputPath: string): Promise<void> {
  const assetList = await listTaskAssets(taskUuid);
  const assets = resolveOrthophotoAssets(assetList);
  const tried: string[] = [];
  let lastError: Error | null = null;

  try {
    const zipPath = `${outputPath}.zip`;
    tried.push('all.zip');
    await downloadTaskAsset(taskUuid, 'all.zip', zipPath);
    await extractOrthophotoFromZip(zipPath, outputPath);
    await fsPromises.unlink(zipPath).catch(() => undefined);
    return;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
  }

  for (const asset of assets) {
    tried.push(asset);
    try {
      await downloadTaskAsset(taskUuid, asset, outputPath);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  const suffix = tried.length > 0 ? ` Tried: ${tried.join(', ')}` : '';
  const assetsHint = assetList.length > 0 ? ` Available assets: ${assetList.join(', ')}` : '';
  throw new Error(`Failed to download orthomosaic.${suffix}${assetsHint}${lastError ? ` Last error: ${lastError.message}` : ''}`);
}

export async function cancelTask(taskUuid: string): Promise<void> {
  await client.post(`/task/cancel`, null, {
    params: { uuid: taskUuid },
  });
}

export async function removeTask(taskUuid: string): Promise<void> {
  await client.post(`/task/remove`, null, {
    params: { uuid: taskUuid },
  });
}

function resolveOrthophotoAssets(assets: string[]): string[] {
  const ranked = rankOrthophotoAssets(assets);
  if (ranked.length > 0) {
    return ranked;
  }

  return [
    'odm_orthophoto/odm_orthophoto.tif',
    'odm_orthophoto/odm_orthophoto.tiff',
    'odm_orthophoto.tif',
    'odm_orthophoto.tiff',
    'orthophoto.tif',
    'orthophoto.tiff',
  ];
}

async function listTaskAssets(taskUuid: string): Promise<string[]> {
  const assetsFromInfo = await fetchTaskAssetsFromInfo(taskUuid);
  if (assetsFromInfo.length > 0) return assetsFromInfo;

  try {
    const res = await client.get(`/task/${taskUuid}/assets`);
    return normalizeAssetList(res.data);
  } catch {
    return [];
  }
}

async function fetchTaskAssetsFromInfo(taskUuid: string): Promise<string[]> {
  try {
    const res = await client.get(`/task/${taskUuid}/info`);
    return normalizeAssetList(res.data);
  } catch {
    return [];
  }
}

function normalizeAssetList(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const maybeArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.map(item => String(item)) : [];
  const maybeObjectKeys = (value: unknown): string[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.keys(value as Record<string, unknown>);
  };

  const record = data as Record<string, unknown>;
  const candidates = [
    maybeArray(record.assets),
    maybeObjectKeys(record.assets),
    maybeArray(record.availableAssets),
    maybeObjectKeys(record.availableAssets),
    maybeArray(record.available_assets),
    maybeObjectKeys(record.available_assets),
    maybeArray(record.available),
    maybeObjectKeys(record.available),
    maybeArray(record.results),
    Array.isArray(data) ? data.map(item => String(item)) : [],
  ];

  for (const candidate of candidates) {
    if (candidate.length > 0) return candidate;
  }
  return [];
}

function rankOrthophotoAssets(assets: string[]): string[] {
  const normalized = assets
    .map(asset => String(asset))
    .filter(asset => asset.trim().length > 0);

  const scoreAsset = (asset: string): number => {
    const lower = asset.toLowerCase();
    let score = 0;
    if (lower.includes('odm_orthophoto')) score += 3;
    if (lower.includes('orthophoto')) score += 2;
    if (lower.includes('ortho')) score += 1;
    return score;
  };

  const orthoCandidates = normalized
    .filter(asset => /ortho/i.test(asset) && /\.(tif|tiff)$/i.test(asset))
    .sort((a, b) => scoreAsset(b) - scoreAsset(a));
  if (orthoCandidates.length > 0) return orthoCandidates;

  const tiffCandidates = normalized.filter(asset =>
    /\.(tif|tiff)$/i.test(asset)
  );
  return tiffCandidates;
}

async function downloadTaskAsset(taskUuid: string, asset: string, outputPath: string): Promise<void> {
  const encodedAsset = encodeAssetPath(asset);
  const res = await client.get(`/task/${taskUuid}/download/${encodedAsset}`, {
    responseType: 'stream',
    timeout: 600000, // 10 minutes for download
    validateStatus: status => status >= 200 && status < 500,
  });

  const contentType = String(res.headers['content-type'] || '');
  const contentLength = Number(res.headers['content-length'] || 0);

  if (res.status >= 400 || contentType.includes('application/json') || contentType.includes('text')) {
    const body = await streamToString(res.data);
    throw new Error(`NodeODM download error (${res.status}): ${body.trim()}`);
  }

  const tmpPath = `${outputPath}.tmp`;
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  await pipeline(res.data, fs.createWriteStream(tmpPath));

  const stats = await fsPromises.stat(tmpPath);
  if (stats.size < 1024 || (contentLength > 0 && stats.size < Math.min(contentLength, 1024))) {
    const body = await fsPromises.readFile(tmpPath, 'utf8').catch(() => '');
    await fsPromises.unlink(tmpPath).catch(() => undefined);
    throw new Error(`Downloaded asset "${asset}" is too small (${stats.size} bytes). ${body.trim()}`.trim());
  }

  await fsPromises.rename(tmpPath, outputPath);
}

function encodeAssetPath(asset: string): string {
  return asset
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return Buffer.concat(chunks).toString('utf8');
}

async function extractOrthophotoFromZip(zipPath: string, outputPath: string): Promise<void> {
  const script = `
import sys, zipfile, shutil

zip_path = sys.argv[1]
output_path = sys.argv[2]

candidates = [
    'odm_orthophoto/odm_orthophoto.tif',
    'odm_orthophoto/odm_orthophoto.tiff',
    'orthophoto.tif',
    'orthophoto.tiff',
]

with zipfile.ZipFile(zip_path) as z:
    names = z.namelist()
    target = None
    for candidate in candidates:
        for name in names:
            if name.endswith(candidate):
                target = name
                break
        if target:
            break

    if not target:
        for name in names:
            lower = name.lower()
            if 'ortho' in lower and (lower.endswith('.tif') or lower.endswith('.tiff')):
                target = name
                break

    if not target:
        print('No orthophoto asset found in zip. Available assets: ' + ', '.join(names), file=sys.stderr)
        sys.exit(2)

    with z.open(target) as src, open(output_path, 'wb') as dst:
        shutil.copyfileobj(src, dst)
`;

  await new Promise<void>((resolve, reject) => {
    const child = spawn('python3', ['-c', script, zipPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', err => reject(err));
    child.on('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `Failed to extract orthophoto from ${zipPath}`));
      }
    });
  });
}
