import { create } from 'zustand';
import type { Project, ProcessingStatus } from '../types';
import * as api from '../api/client';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  processingStatus: ProcessingStatus | null;
  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  fetchProcessingStatus: (id: string) => Promise<ProcessingStatus>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  processingStatus: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await api.listProjects();
      set({ projects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const project = await api.getProject(id);
      set({ currentProject: project, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createProject: async (name: string, description?: string) => {
    set({ loading: true, error: null });
    try {
      const project = await api.createProject({ name, description });
      set(state => ({
        projects: [project, ...state.projects],
        currentProject: project,
        loading: false,
      }));
      return project;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteProject: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.deleteProject(id);
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  fetchProcessingStatus: async (id: string) => {
    try {
      const status = await api.getProcessingStatus(id);
      set({ processingStatus: status });
      return status;
    } catch (error) {
      console.error('Failed to fetch processing status:', error);
      throw error;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  clearError: () => set({ error: null }),
}));
