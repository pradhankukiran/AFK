import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useToast } from '../components/Toast/ToastContext';
import { ProjectListSkeleton } from '../components/Skeleton/Skeleton';
import type { Project } from '../types';

function StatusBadge({ status }: { status: Project['status'] }) {
  const colors = {
    created: 'bg-gray-100 text-gray-800',
    uploading: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete project "${project.name}"?`)) {
      onDelete();
    }
  };

  const href = project.status === 'processing'
    ? `/projects/${project.id}/processing`
    : `/projects/${project.id}`;

  return (
    <Link
      to={href}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>

      {project.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
      )}

      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{project.image_count} images</span>
        <span>{new Date(project.created_at).toLocaleDateString()}</span>
      </div>

      <button
        onClick={handleDelete}
        className="mt-4 text-red-600 text-sm hover:text-red-800"
      >
        Delete
      </button>
    </Link>
  );
}

export default function ProjectList() {
  const { projects, loading, error, fetchProjects, deleteProject } = useProjectStore();
  const { addToast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteProject(id);
      addToast(`Project "${name}" deleted`, 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <Link
            to="/projects/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            New Project
          </Link>
        </div>
        <ProjectListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Link
          to="/projects/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
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
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-gray-500 mt-4 mb-4">No projects yet</p>
          <Link
            to="/projects/new"
            className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={() => handleDelete(project.id, project.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
