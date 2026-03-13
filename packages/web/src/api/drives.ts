import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { DriveRoot, DirectoryEntry, FileReference } from '@/types/models';

export const fetchDrives = () => apiGet<DriveRoot[]>('/drives');
export const fetchDrivesByPurpose = (purpose: 'input' | 'output') =>
  apiGet<DriveRoot[]>(`/drives?purpose=${purpose}`);
export const createDrive = (data: { path: string; name?: string; description?: string; purpose?: 'input' | 'output' }) => apiPost<DriveRoot>('/drives', data);
export const updateDrive = (id: string, data: { name?: string; path?: string; description?: string }) => apiPut<DriveRoot>(`/drives/${id}`, data);
export const deleteDrive = (id: string) => apiDelete(`/drives/${id}`);
export const browseDrive = (id: string, path?: string) => apiGet<DirectoryEntry[]>(`/drives/${id}/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`);
export const pickFolder = () => apiPost<{ path: string | null; cancelled: boolean }>('/drives/pick-folder', {});

export const pickFiles = () => apiPost<{ paths: string[]; cancelled: boolean }>('/drives/pick-files', {});

export const openFile = (path: string) => apiPost<{ ok: boolean }>('/files/open', { path });
export const revealFile = (path: string) => apiPost<{ ok: boolean }>('/files/reveal', { path });

export const fetchFileReferences = (workItemId: string) => apiGet<FileReference[]>(`/work-items/${workItemId}/file-references`);
export const createFileReference = (workItemId: string, data: { drive_root_id?: string; path: string; label?: string; ref_type?: string }) =>
  apiPost<FileReference>(`/work-items/${workItemId}/file-references`, data);
export const deleteFileReference = (id: string) => apiDelete(`/file-references/${id}`);

// Project drive root associations
export const fetchProjectDriveRoots = (projectId: string) => apiGet<DriveRoot[]>(`/projects/${projectId}/drive-roots`);
export const addProjectDriveRoot = (projectId: string, driveRootId: string) =>
  apiPost(`/projects/${projectId}/drive-roots`, { drive_root_id: driveRootId });
export const removeProjectDriveRoot = (projectId: string, driveRootId: string) =>
  apiDelete(`/projects/${projectId}/drive-roots/${driveRootId}`);

// Work item drive root associations
export const fetchWorkItemDriveRoots = (workItemId: string) => apiGet<DriveRoot[]>(`/work-items/${workItemId}/drive-roots`);
export const addWorkItemDriveRoot = (workItemId: string, driveRootId: string) =>
  apiPost(`/work-items/${workItemId}/drive-roots`, { drive_root_id: driveRootId });
export const removeWorkItemDriveRoot = (workItemId: string, driveRootId: string) =>
  apiDelete(`/work-items/${workItemId}/drive-roots/${driveRootId}`);

// Effective drive roots (work-item overrides or project fallback)
export const fetchEffectiveDriveRoots = (workItemId: string, projectId: string) =>
  apiGet<DriveRoot[]>(`/work-items/${workItemId}/effective-drive-roots?project_id=${encodeURIComponent(projectId)}`);
