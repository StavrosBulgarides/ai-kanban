export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Status {
  id: string;
  project_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_hidden: number;
}

export interface WorkItem {
  id: string;
  project_id: string;
  status_id: string;
  title: string;
  description: string;
  sort_order: number;
  parent_id: string | null;
  in_progress_since: string | null;
  viewed_output_at: string | null;
  tool_permissions: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

export interface DriveRoot {
  id: string;
  name: string;
  path: string;
  description: string;
  purpose: 'input' | 'output';
  created_at: string;
}

export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  path: string;
}

export interface FileReference {
  id: string;
  work_item_id: string;
  drive_root_id: string | null;
  path: string;
  label: string;
  ref_type: 'input' | 'output' | 'reference';
  created_at: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  base_url: string;
  auth_type: string;
  auth_token_masked: string;
  config: string;
  is_active: number;
  can_write: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  project_id: string | null;
  work_item_id: string | null;
  name: string;
  description: string;
  prompt_template: string;
  integration_ids: string;
  config: string;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplate {
  id: string;
  project_id: string | null;
  name: string;
  description: string;
  template: string;
  variables: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  work_item_id: string | null;
  skill_id: string | null;
  prompt: string;
  result: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
}

export interface WorkItemTemplate {
  id: string;
  project_id: string | null;
  name: string;
  description: string;
  template_data: string;
  schedule_cron: string | null;
  schedule_enabled: number;
  target_status_id: string | null;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClarificationMessage {
  id: string;
  work_item_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface NormalizedItem {
  externalId: string;
  title: string;
  description: string;
  status: string;
  url: string;
  type: string;
}
