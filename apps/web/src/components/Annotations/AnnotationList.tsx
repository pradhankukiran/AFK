import type { Annotation } from '../../types';

interface AnnotationListProps {
  annotations: Annotation[];
  selectedAnnotation: Annotation | null;
  onSelect: (annotation: Annotation | null) => void;
  onEdit: (annotation: Annotation) => void;
  onDelete: (annotationId: string) => void;
}

export default function AnnotationList({
  annotations,
  selectedAnnotation,
  onSelect,
  onEdit,
  onDelete,
}: AnnotationListProps) {
  if (annotations.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <svg
          className="mx-auto h-12 w-12 text-gray-300 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="font-medium">No annotations yet</p>
        <p className="text-sm mt-1">
          Use the drawing tools on the map to mark areas of interest
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {annotations.map(annotation => (
        <AnnotationCard
          key={annotation.id}
          annotation={annotation}
          isSelected={selectedAnnotation?.id === annotation.id}
          onSelect={() => onSelect(annotation)}
          onEdit={() => onEdit(annotation)}
          onDelete={() => onDelete(annotation.id)}
        />
      ))}
    </div>
  );
}

function AnnotationCard({
  annotation,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const categoryColors: Record<string, string> = {
    disease: 'bg-red-100 text-red-800',
    irrigation: 'bg-blue-100 text-blue-800',
    pest: 'bg-amber-100 text-amber-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const formatArea = (sqm: number | null) => {
    if (!sqm) return null;
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha`;
    }
    return `${sqm.toFixed(1)} m²`;
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-primary-50 border-l-4 border-primary-500' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 truncate pr-2">{annotation.label}</h4>
        {annotation.category && (
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
              categoryColors[annotation.category] || categoryColors.other
            }`}
          >
            {annotation.category}
          </span>
        )}
      </div>

      {annotation.notes && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{annotation.notes}</p>
      )}

      <div className="text-xs text-gray-500 mb-3">
        {annotation.area_sqm && (
          <span className="mr-3">Area: {formatArea(annotation.area_sqm)}</span>
        )}
        {annotation.perimeter_m && (
          <span>Perimeter: {annotation.perimeter_m.toFixed(1)} m</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
