import { useState } from 'react';
import { getExportUrl } from '../../api/client';

interface ExportModalProps {
  projectId: string;
  onClose: () => void;
}

type ExportFormat = 'geojson' | 'csv' | 'shapefile';

export default function ExportModal({ projectId, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('geojson');
  const [downloading, setDownloading] = useState(false);

  const formats: { value: ExportFormat; label: string; description: string }[] = [
    {
      value: 'geojson',
      label: 'GeoJSON',
      description: 'Standard format for web mapping applications',
    },
    {
      value: 'csv',
      label: 'CSV',
      description: 'Spreadsheet format with coordinates for GPS devices',
    },
    {
      value: 'shapefile',
      label: 'Shapefile',
      description: 'Compatible with GIS software (QGIS, ArcGIS)',
    },
  ];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = getExportUrl(projectId, selectedFormat);
      window.location.href = url;
    } finally {
      setDownloading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Annotations</h2>

        <div className="space-y-3 mb-6">
          {formats.map(format => (
            <label
              key={format.value}
              className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedFormat === format.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="format"
                value={format.value}
                checked={selectedFormat === format.value}
                onChange={() => setSelectedFormat(format.value)}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">{format.label}</div>
                <div className="text-sm text-gray-500">{format.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
            disabled={downloading}
          >
            {downloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
