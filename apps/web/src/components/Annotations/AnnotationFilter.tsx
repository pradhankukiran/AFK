import type { AnnotationCategory } from '../../types';

interface AnnotationFilterProps {
  value: AnnotationCategory | 'all';
  onChange: (filter: AnnotationCategory | 'all') => void;
  counts: Record<string, number>;
}

export default function AnnotationFilter({ value, onChange, counts }: AnnotationFilterProps) {
  const options: { value: AnnotationCategory | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-800' },
    { value: 'disease', label: 'Disease', color: 'bg-red-100 text-red-800' },
    { value: 'irrigation', label: 'Irrigation', color: 'bg-blue-100 text-blue-800' },
    { value: 'pest', label: 'Pest', color: 'bg-amber-100 text-amber-800' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-600' },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-3 border-b border-gray-200">
      {options.map(option => {
        const count = option.value === 'all'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : counts[option.value] || 0;
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              px-3 py-1 text-xs font-medium rounded-full transition-all
              ${isActive
                ? `${option.color} ring-2 ring-offset-1 ring-gray-400`
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }
            `}
          >
            {option.label}
            <span className="ml-1 opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
