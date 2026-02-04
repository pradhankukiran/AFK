import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast/ToastContext';
import ProjectList from './pages/ProjectList';
import ProjectUpload from './pages/ProjectUpload';
import ProjectProcessing from './pages/ProjectProcessing';
import ProjectView from './pages/ProjectView';

export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-primary-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="/" className="text-xl font-bold">
                AFK - AgriFieldKinematic
              </a>
              <a
                href="/projects"
                className="text-primary-100 hover:text-white transition-colors"
              >
                Projects
              </a>
            </div>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/new" element={<ProjectUpload />} />
            <Route path="/projects/:id/processing" element={<ProjectProcessing />} />
            <Route path="/projects/:id" element={<ProjectView />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
