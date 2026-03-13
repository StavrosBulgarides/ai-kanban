import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/projects';

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: api.fetchProjects });
}

export function useProject(id: string) {
  return useQuery({ queryKey: ['projects', id], queryFn: () => api.fetchProject(id), enabled: !!id });
}

export function useProjectIndicators() {
  return useQuery({ queryKey: ['project-indicators'], queryFn: api.fetchProjectIndicators, refetchInterval: 5000 });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { name: string; description?: string }) => api.createProject(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }) });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) => api.updateProject(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteProject, onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }) });
}
