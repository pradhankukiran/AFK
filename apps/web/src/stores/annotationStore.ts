import { create } from 'zustand';
import type { Annotation, CreateAnnotationRequest, AnnotationCategory } from '../types';
import * as api from '../api/client';

interface AnnotationState {
  annotations: Annotation[];
  selectedAnnotation: Annotation | null;
  loading: boolean;
  error: string | null;
  filter: AnnotationCategory | 'all';

  fetchAnnotations: (projectId: string) => Promise<void>;
  createAnnotation: (projectId: string, data: CreateAnnotationRequest) => Promise<Annotation>;
  updateAnnotation: (projectId: string, annotationId: string, data: Partial<CreateAnnotationRequest>) => Promise<Annotation>;
  deleteAnnotation: (projectId: string, annotationId: string) => Promise<void>;
  selectAnnotation: (annotation: Annotation | null) => void;
  setFilter: (filter: AnnotationCategory | 'all') => void;
  clearAnnotations: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
  selectedAnnotation: null,
  loading: false,
  error: null,
  filter: 'all',

  fetchAnnotations: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const annotations = await api.listAnnotations(projectId);
      set({ annotations, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createAnnotation: async (projectId: string, data: CreateAnnotationRequest) => {
    set({ loading: true, error: null });
    try {
      const annotation = await api.createAnnotation(projectId, data);
      set(state => ({
        annotations: [annotation, ...state.annotations],
        loading: false,
      }));
      return annotation;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateAnnotation: async (projectId: string, annotationId: string, data: Partial<CreateAnnotationRequest>) => {
    set({ loading: true, error: null });
    try {
      const annotation = await api.updateAnnotation(projectId, annotationId, data);
      set(state => ({
        annotations: state.annotations.map(a => a.id === annotationId ? annotation : a),
        selectedAnnotation: state.selectedAnnotation?.id === annotationId ? annotation : state.selectedAnnotation,
        loading: false,
      }));
      return annotation;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteAnnotation: async (projectId: string, annotationId: string) => {
    set({ loading: true, error: null });
    try {
      await api.deleteAnnotation(projectId, annotationId);
      set(state => ({
        annotations: state.annotations.filter(a => a.id !== annotationId),
        selectedAnnotation: state.selectedAnnotation?.id === annotationId ? null : state.selectedAnnotation,
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  selectAnnotation: (annotation) => set({ selectedAnnotation: annotation }),

  setFilter: (filter) => set({ filter }),

  clearAnnotations: () => set({ annotations: [], selectedAnnotation: null, filter: 'all' }),
}));
