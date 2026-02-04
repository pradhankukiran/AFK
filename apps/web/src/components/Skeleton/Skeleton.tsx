interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mt-2" />
      <Skeleton className="h-4 w-3/4 mt-2" />
      <div className="flex justify-between items-center mt-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function ProjectListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AnnotationListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mt-2" />
          <div className="flex justify-between items-center mt-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
        <p className="mt-4 text-gray-500">Loading map...</p>
      </div>
    </div>
  );
}
