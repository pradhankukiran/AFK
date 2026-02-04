import { useState } from 'react';
import type { Annotation, AnnotationCategory } from '../../types';

interface AnnotationEditModalProps {
  annotation: Annotation;
  onSave: (data: { label: string; category?: AnnotationCategory; notes?: string }) => Promise<void>;
  onClose: () => void;
}

export default function AnnotationEditModal({ annotation, onSave, onClose }: AnnotationEditModalProps) {
  const [label, setLabel] = useState(annotation.label);
  const [category, setCategory] = useState<AnnotationCategory | ''>(annotation.category || '');
  const [notes, setNotes] = useState(annotation.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatArea = (sqm: number | null) => {
    if (!sqm) return 'N/A';
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha`;
    }
    return `${sqm.toFixed(1)} m²`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      setError('Label is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSave({
        label: label.trim(),
        category: category || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Annotation</h2>

        {/* Read-only info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Area:</span>
              <span className="ml-2 font-medium">{formatArea(annotation.area_sqm)}</span>
            </div>
            <div>
              <span className="text-gray-500">Perimeter:</span>
              <span className="ml-2 font-medium">
                {annotation.perimeter_m ? `${annotation.perimeter_m.toFixed(1)} m` : 'N/A'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 font-medium">
                {new Date(annotation.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              type="text"
              id="label"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value as AnnotationCategory | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">No category</option>
              <option value="disease">Disease</option>
              <option value="irrigation">Irrigation</option>
              <option value="pest">Pest</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional observations..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
              disabled={submitting || !label.trim()}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
