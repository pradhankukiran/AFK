import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
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
  const res = await client.get(`/task/${taskUuid}/download/orthophoto.tif`, {
    responseType: 'stream',
    timeout: 600000, // 10 minutes for download
  });

  const writer = fs.createWriteStream(outputPath);
  res.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
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
