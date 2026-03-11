import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { DriveRoot, DirectoryEntry, FileReference } from '@/types/models';

export const fetchDrives = () => apiGet<DriveRoot[]>('/drives');
export const createDrive = (data: { name: string; path: string; description?: string }) => apiPost<DriveRoot>('/drives', data);
export const updateDrive = (id: string, data: { name?: string; path?: string; description?: string }) => apiPut<DriveRoot>(`/drives/${id}`, data);
export const deleteDrive = (id: string) => apiDelete(`/drives/${id}`);
export const browseDrive = (id: string, path?: string) => apiGet<DirectoryEntry[]>(`/drives/${id}/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`);

export const fetchFileReferences = (workItemId: string) => apiGet<FileReference[]>(`/work-items/${workItemId}/file-references`);
export const createFileReference = (workItemId: string, data: { drive_root_id?: string; path: string; label?: string; ref_type?: string }) =>
  apiPost<FileReference>(`/work-items/${workItemId}/file-references`, data);
export const deleteFileReference = (id: string) => apiDelete(`/file-references/${id}`);
