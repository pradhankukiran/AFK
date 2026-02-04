import { useEffect, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';

interface ProcessingStatusProps {
  projectId: string;
}

export default function ProcessingStatus({ projectId: _projectId }: ProcessingStatusProps) {
  const { processingStatus } = useProjectStore();
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animate dots
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Note: Parent component (ProjectProcessing) handles polling
  // This component just displays the status from the store

  const status = processingStatus || { status: 'processing', progress: 0, stage: 'Starting' };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Processing Orthomosaic{dots}
      </h2>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{status.stage}</span>
          <span className="text-sm text-gray-600">{Math.round(status.progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Processing Steps</h3>
        <ul className="space-y-2 text-sm">
          <Step
            label="Upload images to processor"
            completed={status.progress > 0}
            active={status.progress === 0}
          />
          <Step
            label="Structure from Motion"
            completed={status.progress > 30}
            active={status.progress > 0 && status.progress <= 30}
          />
          <Step
            label="Dense point cloud generation"
            completed={status.progress > 60}
            active={status.progress > 30 && status.progress <= 60}
          />
          <Step
            label="Orthomosaic generation"
            completed={status.progress > 90}
            active={status.progress > 60 && status.progress <= 90}
          />
          <Step
            label="Finalizing"
            completed={status.progress === 100}
            active={status.progress > 90 && status.progress < 100}
          />
        </ul>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        Processing typically takes 15-30 minutes for 50-100 images.
        This page will automatically update when complete.
      </p>
    </div>
  );
}

function Step({ label, completed, active }: { label: string; completed: boolean; active: boolean }) {
  return (
    <li className="flex items-center">
      {completed ? (
        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ) : active ? (
        <svg className="w-5 h-5 text-primary-500 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" />
        </svg>
      )}
      <span className={completed ? 'text-gray-600' : active ? 'text-gray-900 font-medium' : 'text-gray-400'}>
        {label}
      </span>
    </li>
  );
}
