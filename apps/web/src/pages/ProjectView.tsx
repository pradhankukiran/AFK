import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useAnnotationStore } from '../stores/annotationStore';
import { useToast } from '../components/Toast/ToastContext';
import MapContainer from '../components/Map/MapContainer';
import AnnotationList from '../components/Annotations/AnnotationList';
import AnnotationFilter from '../components/Annotations/AnnotationFilter';
import AnnotationForm from '../components/Annotations/AnnotationForm';
import AnnotationEditModal from '../components/Annotations/AnnotationEditModal';
import ExportModal from '../components/Export/ExportModal';
import { AnnotationListSkeleton } from '../components/Skeleton/Skeleton';
import type { Annotation, CreateAnnotationRequest, AnnotationCategory } from '../types';

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { currentProject, fetchProject, loading: projectLoading } = useProjectStore();
  const {
    annotations,
    selectedAnnotation,
    loading: annotationsLoading,
    filter,
    fetchAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    setFilter,
    clearAnnotations,
  } = useAnnotationStore();

  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Geometry | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    annotations.forEach(a => {
      const cat = a.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [annotations]);

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    if (filter === 'all') return annotations;
    return annotations.filter(a => a.category === filter);
  }, [annotations, filter]);

  useEffect(() => {
    if (id) {
      fetchProject(id);
      fetchAnnotations(id);
    }

    return () => {
      clearAnnotations();
    };
  }, [id, fetchProject, fetchAnnotations, clearAnnotations]);

  useEffect(() => {
    if (currentProject?.status === 'processing') {
      navigate(`/projects/${id}/processing`);
    }
  }, [currentProject, id, navigate]);

  const handleShapeCreated = (geometry: GeoJSON.Geometry) => {
    setPendingGeometry(geometry);
    setShowAnnotationForm(true);
  };

  const handleAnnotationSubmit = async (data: Omit<CreateAnnotationRequest, 'geometry'>) => {
    if (!id || !pendingGeometry) return;

    try {
      await createAnnotation(id, {
        ...data,
        geometry: pendingGeometry,
      });
      addToast('Annotation created', 'success');
      setShowAnnotationForm(false);
      setPendingGeometry(null);
    } catch (err) {
      addToast((err as Error).message, 'error');
    }
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    selectAnnotation(annotation);
  };

  const handleEditAnnotation = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
  };

  const handleSaveEdit = async (data: { label: string; category?: AnnotationCategory; notes?: string }) => {
    if (!id || !editingAnnotation) return;

    try {
      await updateAnnotation(id, editingAnnotation.id, data);
      addToast('Annotation updated', 'success');
      setEditingAnnotation(null);
    } catch (err) {
      addToast((err as Error).message, 'error');
      throw err;
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!id) return;
    if (confirm('Delete this annotation?')) {
      try {
        await deleteAnnotation(id, annotationId);
        addToast('Annotation deleted', 'success');
      } catch (err) {
        addToast((err as Error).message, 'error');
      }
    }
  };

  if (projectLoading || !currentProject) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (currentProject.status !== 'ready') {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg
            className="mx-auto h-16 w-16 text-gray-300"
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
          <p className="text-gray-600 mt-4 mb-2">
            Orthomosaic not available
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Project status: <span className="font-medium">{currentProject.status}</span>
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="text-primary-600 hover:text-primary-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          project={currentProject}
          annotations={filteredAnnotations}
          selectedAnnotation={selectedAnnotation}
          onShapeCreated={handleShapeCreated}
          onAnnotationClick={handleAnnotationClick}
        />

        {/* Project info overlay */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h2 className="font-semibold text-gray-900">{currentProject.name}</h2>
          {currentProject.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{currentProject.description}</p>
          )}
          <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
            <span>{currentProject.image_count} images</span>
            <span className="text-gray-300">|</span>
            <span>{annotations.length} annotations</span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Annotations</h3>
            <button
              onClick={() => setShowExportModal(true)}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
              disabled={annotations.length === 0}
            >
              Export
            </button>
          </div>
        </div>

        {/* Filter */}
        <AnnotationFilter
          value={filter}
          onChange={setFilter}
          counts={categoryCounts}
        />

        {/* Annotation list */}
        <div className="flex-1 overflow-y-auto">
          {annotationsLoading ? (
            <AnnotationListSkeleton />
          ) : (
            <AnnotationList
              annotations={filteredAnnotations}
              selectedAnnotation={selectedAnnotation}
              onSelect={selectAnnotation}
              onEdit={handleEditAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          )}
        </div>

        {/* Stats footer */}
        {annotations.length > 0 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Total area:</span>
              <span className="font-medium">
                {(() => {
                  const totalArea = annotations.reduce((sum, a) => sum + (a.area_sqm || 0), 0);
                  if (totalArea >= 10000) {
                    return `${(totalArea / 10000).toFixed(2)} ha`;
                  }
                  return `${totalArea.toFixed(1)} m²`;
                })()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Annotation Form Modal */}
      {showAnnotationForm && (
        <AnnotationForm
          onSubmit={handleAnnotationSubmit}
          onCancel={() => {
            setShowAnnotationForm(false);
            setPendingGeometry(null);
          }}
        />
      )}

      {/* Edit Annotation Modal */}
      {editingAnnotation && (
        <AnnotationEditModal
          annotation={editingAnnotation}
          onSave={handleSaveEdit}
          onClose={() => setEditingAnnotation(null)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && id && (
        <ExportModal
          projectId={id}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
