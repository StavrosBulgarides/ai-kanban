import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Project } from '@/types/models';

export const fetchProjects = () => apiGet<Project[]>('/projects');
export const fetchProject = (id: string) => apiGet<Project>(`/projects/${id}`);
export const createProject = (data: { name: string; description?: string }) => apiPost<Project>('/projects', data);
export const updateProject = (id: string, data: { name?: string; description?: string }) => apiPut<Project>(`/projects/${id}`, data);
export const deleteProject = (id: string) => apiDelete(`/projects/${id}`);
export const fetchProjectIndicators = () => apiGet<Record<string, { hasInputRequired: boolean; allDone: boolean }>>('/projects/indicators');
