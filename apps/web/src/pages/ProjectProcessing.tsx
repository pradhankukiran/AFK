import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import ProcessingStatus from '../components/Processing/ProcessingStatus';

export default function ProjectProcessing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, fetchProject, fetchProcessingStatus } = useProjectStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProject(id);
    }
  }, [id, fetchProject]);

  useEffect(() => {
    if (!id) return;

    const checkStatus = async () => {
      try {
        const status = await fetchProcessingStatus(id);

        if (status.status === 'ready') {
          navigate(`/projects/${id}`);
        } else if (status.status === 'failed') {
          setError(status.error || 'Processing failed');
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [id, fetchProcessingStatus, navigate]);

  if (!currentProject) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentProject.name}</h1>
      {currentProject.description && (
        <p className="text-gray-600 mb-8">{currentProject.description}</p>
      )}

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Processing Failed</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/projects')}
            className="text-red-700 hover:text-red-900 font-medium"
          >
            Back to Projects
          </button>
        </div>
      ) : (
        <ProcessingStatus projectId={id!} />
      )}
    </div>
  );
}
