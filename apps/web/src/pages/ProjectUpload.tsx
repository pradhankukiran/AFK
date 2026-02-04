import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useToast } from '../components/Toast/ToastContext';
import DropZone from '../components/Upload/DropZone';
import UploadProgress from '../components/Upload/UploadProgress';
import * as api from '../api/client';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectUpload() {
  const navigate = useNavigate();
  const createProject = useProjectStore(state => state.createProject);
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
    addToast(`${newFiles.length} image(s) added`, 'info');
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    if (files.length < 2) {
      setError('At least 2 images are required for processing');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create project
      const project = await createProject(name.trim(), description.trim() || undefined);
      addToast('Project created, uploading images...', 'info');

      // Upload images
      await api.uploadImages(project.id, files, setUploadProgress);
      addToast('Images uploaded, starting processing...', 'success');

      // Start processing
      await api.startProcessing(project.id);

      // Navigate to processing page
      navigate(`/projects/${project.id}/processing`);
    } catch (err) {
      setError((err as Error).message);
      addToast((err as Error).message, 'error');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">New Project</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Field Survey 2024-02"
            disabled={uploading}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="North field drone survey for irrigation assessment"
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Drone Images <span className="text-red-500">*</span>
            <span className="font-normal text-gray-500 ml-2">(minimum 2 images with GPS data)</span>
          </label>
          <DropZone
            onFilesSelected={handleFilesSelected}
            disabled={uploading}
          />

          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-600">
                  {files.length} image{files.length !== 1 ? 's' : ''} selected
                  <span className="text-gray-400 ml-2">({formatFileSize(totalSize)})</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-sm text-red-500 hover:text-red-700"
                  disabled={uploading}
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{file.name}</span>
                      <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-500 hover:text-red-700 ml-2 p-1"
                      disabled={uploading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {uploading && (
          <UploadProgress progress={uploadProgress} />
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            disabled={uploading || !name.trim() || files.length < 2}
          >
            {uploading ? 'Uploading...' : 'Create & Start Processing'}
          </button>
        </div>

        {files.length > 0 && files.length < 2 && (
          <p className="text-sm text-amber-600">
            Add at least {2 - files.length} more image{2 - files.length !== 1 ? 's' : ''} to enable processing
          </p>
        )}
      </form>
    </div>
  );
}
