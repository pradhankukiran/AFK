import { useState } from 'react';
import type { AnnotationCategory, CreateAnnotationRequest } from '../../types';

interface AnnotationFormProps {
  onSubmit: (data: Omit<CreateAnnotationRequest, 'geometry'>) => Promise<void>;
  onCancel: () => void;
}

export default function AnnotationForm({ onSubmit, onCancel }: AnnotationFormProps) {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<AnnotationCategory | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      setError('Label is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        label: label.trim(),
        category: category || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Annotation</h2>

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
              placeholder="e.g., Disease Zone A"
              autoFocus
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
              <option value="">Select category...</option>
              <option value="disease">Disease</option>
              <option value="irrigation">Irrigation</option>
              <option value="pest">Pest</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
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
              onClick={onCancel}
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
              {submitting ? 'Saving...' : 'Save Annotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
