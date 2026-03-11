import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/projects';

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: api.fetchProjects });
}

export function useProject(id: string) {
  return useQuery({ queryKey: ['projects', id], queryFn: () => api.fetchProject(id), enabled: !!id });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { name: string; description?: string }) => api.createProject(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }) });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteProject, onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }) });
}
