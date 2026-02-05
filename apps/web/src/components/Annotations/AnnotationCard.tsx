import type { Annotation } from '../../types';

interface AnnotationCardProps {
  annotation: Annotation;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export default function AnnotationCard({
  annotation,
  isSelected,
  onClick,
  onDelete,
}: AnnotationCardProps) {
  const categoryColors: Record<string, { bg: string; text: string }> = {
    disease: { bg: 'bg-red-100', text: 'text-red-800' },
    irrigation: { bg: 'bg-blue-100', text: 'text-blue-800' },
    pest: { bg: 'bg-amber-100', text: 'text-amber-800' },
    other: { bg: 'bg-gray-100', text: 'text-gray-800' },
  };

  const colors = annotation.category
    ? categoryColors[annotation.category] || categoryColors.other
    : categoryColors.other;

  const formatArea = (sqm: number | null) => {
    if (typeof sqm !== 'number') return null;
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha`;
    }
    return `${sqm.toFixed(1)} m²`;
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{annotation.label}</h4>
          {annotation.category && (
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
            >
              {annotation.category}
            </span>
          )}
        </div>
      </div>

      {annotation.notes && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{annotation.notes}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 space-x-2">
          {annotation.area_sqm && <span>Area: {formatArea(annotation.area_sqm)}</span>}
          {typeof annotation.perimeter_m === 'number' && (
            <span>Perimeter: {annotation.perimeter_m.toFixed(0)} m</span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
