import type {
  Project,
  Annotation,
  ProcessingStatus,
  CreateProjectRequest,
  CreateAnnotationRequest,
} from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Projects
export async function listProjects(): Promise<Project[]> {
  return fetchJSON<Project[]>(`${API_BASE}/projects`);
}

export async function getProject(id: string): Promise<Project> {
  return fetchJSON<Project>(`${API_BASE}/projects/${id}`);
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  return fetchJSON<Project>(`${API_BASE}/projects`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return fetchJSON<void>(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
  });
}

export async function getProcessingStatus(id: string): Promise<ProcessingStatus> {
  return fetchJSON<ProcessingStatus>(`${API_BASE}/projects/${id}/status`);
}

// Images
export async function uploadImages(
  projectId: string,
  files: File[],
  onProgress?: (progress: number) => void
): Promise<{ uploaded: number; total: number }> {
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.statusText || 'Upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('POST', `${API_BASE}/projects/${projectId}/images`);
    xhr.send(formData);
  });
}

export async function startProcessing(projectId: string): Promise<void> {
  return fetchJSON<void>(`${API_BASE}/projects/${projectId}/process`, {
    method: 'POST',
  });
}

// Annotations
export async function listAnnotations(projectId: string): Promise<Annotation[]> {
  return fetchJSON<Annotation[]>(`${API_BASE}/projects/${projectId}/annotations`);
}

export async function createAnnotation(
  projectId: string,
  data: CreateAnnotationRequest
): Promise<Annotation> {
  return fetchJSON<Annotation>(`${API_BASE}/projects/${projectId}/annotations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAnnotation(
  projectId: string,
  annotationId: string,
  data: Partial<CreateAnnotationRequest>
): Promise<Annotation> {
  return fetchJSON<Annotation>(
    `${API_BASE}/projects/${projectId}/annotations/${annotationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteAnnotation(
  projectId: string,
  annotationId: string
): Promise<void> {
  return fetchJSON<void>(
    `${API_BASE}/projects/${projectId}/annotations/${annotationId}`,
    {
      method: 'DELETE',
    }
  );
}

// Export
export function getExportUrl(projectId: string, format: 'geojson' | 'csv' | 'shapefile'): string {
  return `${API_BASE}/projects/${projectId}/export/${format}`;
}
