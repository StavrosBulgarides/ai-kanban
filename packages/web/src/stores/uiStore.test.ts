import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store to defaults
    useUIStore.setState({
      viewMode: 'kanban',
      selectedWorkItemId: null,
      sidebarOpen: true,
      filters: { search: '', tagIds: [] },
      settingsTab: 'ai',
    });
  });

  describe('viewMode', () => {
    it('defaults to kanban', () => {
      expect(useUIStore.getState().viewMode).toBe('kanban');
    });

    it('can be set to list', () => {
      useUIStore.getState().setViewMode('list');
      expect(useUIStore.getState().viewMode).toBe('list');
    });

    it('can be set back to kanban', () => {
      useUIStore.getState().setViewMode('list');
      useUIStore.getState().setViewMode('kanban');
      expect(useUIStore.getState().viewMode).toBe('kanban');
    });
  });

  describe('selectedWorkItemId', () => {
    it('defaults to null', () => {
      expect(useUIStore.getState().selectedWorkItemId).toBeNull();
    });

    it('can select a work item', () => {
      useUIStore.getState().setSelectedWorkItemId('item-1');
      expect(useUIStore.getState().selectedWorkItemId).toBe('item-1');
    });

    it('can deselect', () => {
      useUIStore.getState().setSelectedWorkItemId('item-1');
      useUIStore.getState().setSelectedWorkItemId(null);
      expect(useUIStore.getState().selectedWorkItemId).toBeNull();
    });
  });

  describe('sidebarOpen', () => {
    it('defaults to true', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('can be closed', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe('filters', () => {
    it('defaults to empty search and tagIds', () => {
      const { filters } = useUIStore.getState();
      expect(filters.search).toBe('');
      expect(filters.tagIds).toEqual([]);
    });

    it('updates search filter', () => {
      useUIStore.getState().setFilters({ search: 'bug' });
      expect(useUIStore.getState().filters.search).toBe('bug');
      expect(useUIStore.getState().filters.tagIds).toEqual([]);
    });

    it('updates tagIds filter', () => {
      useUIStore.getState().setFilters({ tagIds: ['tag-1', 'tag-2'] });
      expect(useUIStore.getState().filters.tagIds).toEqual(['tag-1', 'tag-2']);
      expect(useUIStore.getState().filters.search).toBe('');
    });

    it('merges partial filter updates', () => {
      useUIStore.getState().setFilters({ search: 'hello' });
      useUIStore.getState().setFilters({ tagIds: ['t1'] });
      const { filters } = useUIStore.getState();
      expect(filters.search).toBe('hello');
      expect(filters.tagIds).toEqual(['t1']);
    });

    it('resetFilters clears all filters', () => {
      useUIStore.getState().setFilters({ search: 'test', tagIds: ['t1'] });
      useUIStore.getState().resetFilters();
      const { filters } = useUIStore.getState();
      expect(filters.search).toBe('');
      expect(filters.tagIds).toEqual([]);
    });
  });

  describe('settingsTab', () => {
    it('defaults to ai', () => {
      expect(useUIStore.getState().settingsTab).toBe('ai');
    });

    it('can be changed', () => {
      useUIStore.getState().setSettingsTab('integrations');
      expect(useUIStore.getState().settingsTab).toBe('integrations');
    });
  });
});
