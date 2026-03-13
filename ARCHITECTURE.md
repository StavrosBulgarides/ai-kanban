# Architecture

This document describes the technical architecture of AI Kanban — a full-stack TypeScript application that orchestrates AI agents through a Kanban board interface.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  React SPA (Vite)                                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │  │
│  │  │ Kanban   │ │ Work     │ │ Settings │ │ Projects       │  │  │
│  │  │ Board    │ │ Item     │ │ Panel    │ │ List           │  │  │
│  │  │          │ │ Detail   │ │          │ │                │  │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬────────┘  │  │
│  │       │             │            │               │           │  │
│  │  ┌────┴─────────────┴────────────┴───────────────┴────────┐  │  │
│  │  │  State Layer                                           │  │  │
│  │  │  React Query (server state, 3s polling)                │  │  │
│  │  │  Zustand (UI state: view mode, filters, selection)     │  │  │
│  │  └────────────────────────┬───────────────────────────────┘  │  │
│  │                           │ HTTP /api/*                      │  │
│  └───────────────────────────┼──────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│  Express API Server          │                                      │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │  Middleware: CORS, Helmet, SSO Validation, Error Handler      │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │  Routes Layer (76 endpoints)                                  │  │
│  │  projects, workItems, statuses, tags, agent, drives,          │  │
│  │  integrations, skills, templates, clarifications, aiConfig    │  │
│  └──────────┬──────────────────┬────────────────────┬────────────┘  │
│             │                  │                    │                │
│  ┌──────────┴───────┐ ┌───────┴────────┐ ┌────────┴─────────────┐  │
│  │  DB Models       │ │  Agent Layer   │ │  Services            │  │
│  │  (15 tables)     │ │  executor      │ │  templateScheduler   │  │
│  │  projects        │ │  prompts       │ │  eventLog            │  │
│  │  work_items      │ │  providers     │ │  driveService        │  │
│  │  statuses        │ │                │ │                      │  │
│  │  tags            │ │  Integrations  │ │  Lib                 │  │
│  │  agent_runs      │ │  jira, github  │ │  crypto (AES-256)    │  │
│  │  integrations    │ │  aha, custom   │ │  enterpriseConfig    │  │
│  │  skills          │ │  registry      │ │  keyManagement       │  │
│  │  ...             │ │                │ │                      │  │
│  └────────┬─────────┘ └───────┬────────┘ └──────────────────────┘  │
│           │                   │                                     │
│  ┌────────┴─────────┐ ┌──────┴─────────────────────────────────┐   │
│  │  SQLite (WAL)    │ │  AI Providers                          │   │
│  │  better-sqlite3  │ │  Claude Agent SDK  │  Codex SDK        │   │
│  │                  │ │  Anthropic API     │  OpenAI API       │   │
│  └──────────────────┘ └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
ai-kanban/
├── packages/
│   ├── server/                    # Express backend
│   │   └── src/
│   │       ├── index.ts           # App entry, middleware, routes, shutdown
│   │       ├── agent/
│   │       │   ├── executor.ts    # Agent orchestration & status transitions
│   │       │   ├── prompts.ts     # Template resolution & context building
│   │       │   └── providers.ts   # Multi-provider AI abstraction
│   │       ├── db/
│   │       │   ├── connection.ts  # SQLite singleton (WAL, foreign keys)
│   │       │   ├── migrate.ts     # Sequential migration runner
│   │       │   ├── migrations/    # 9 SQL migration files
│   │       │   └── models/        # 13 data access modules
│   │       ├── integrations/
│   │       │   ├── registry.ts    # Plugin registry pattern
│   │       │   ├── types.ts       # Adapter interface definitions
│   │       │   ├── jira.ts        # Jira REST adapter
│   │       │   ├── github.ts      # GitHub REST adapter
│   │       │   ├── aha.ts         # Aha! REST adapter
│   │       │   └── custom.ts      # Generic HTTP adapter
│   │       ├── lib/
│   │       │   ├── crypto.ts      # AES-256-GCM encrypt/decrypt
│   │       │   ├── enterpriseConfig.ts  # Enterprise mode, tool permissions
│   │       │   ├── keyManagement.ts     # Encryption key resolution
│   │       │   └── uuid.ts       # ID generation
│   │       ├── middleware/
│   │       │   ├── errorHandler.ts  # Zod errors + enterprise error masking
│   │       │   └── ssoValidation.ts # SSO proxy validation stub
│   │       ├── routes/            # 12 route modules (76 endpoints)
│   │       └── services/
│   │           ├── eventLog.ts    # In-memory audit/debug log (100 entries)
│   │           ├── templateScheduler.ts  # Cron-based template execution
│   │           └── driveService.ts       # File system browsing
│   │
│   └── web/                       # React frontend
│       └── src/
│           ├── App.tsx            # Router: /, /projects, /projects/:id, /settings
│           ├── main.tsx           # React entry point
│           ├── api/               # 12 typed API client modules
│           ├── components/
│           │   ├── kanban/        # KanbanBoard, KanbanColumn, KanbanCard
│           │   ├── detail/        # WorkItemDetail, ClarificationPanel, FileReferences
│           │   ├── layout/        # AppShell, Header, Sidebar
│           │   ├── list/          # ListView
│           │   ├── settings/      # 8 settings panels
│           │   └── ui/            # Button, Input, Dialog, Badge, Textarea
│           ├── hooks/             # React Query hooks for data operations
│           ├── stores/            # Zustand UI state
│           ├── types/             # TypeScript model interfaces
│           └── lib/               # Utility functions
│
├── pnpm-workspace.yaml
└── tsconfig.base.json             # Shared TS config (ES2022, strict, ESM)
```

---

## Data Model

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   projects   │──1:N──│   statuses   │       │     tags     │
│              │       │              │       │              │
│ id           │       │ id           │       │ id           │
│ name         │       │ project_id   │       │ project_id   │
│ description  │       │ name         │       │ name         │
│ created_at   │       │ color        │       │ color        │
│ updated_at   │       │ sort_order   │       └──────┬───────┘
└──────┬───────┘       │ is_hidden    │              │
       │               └──────┬───────┘              │ N:M
       │                      │                      │
       │ 1:N            1:N   │            ┌─────────┴────────┐
       │               ┌──────┴───────┐    │ work_item_tags   │
       └───────────────│  work_items  │────│                  │
                       │              │    │ work_item_id     │
                       │ id           │    │ tag_id           │
                       │ project_id   │    └──────────────────┘
                       │ status_id    │
                       │ title        │
                       │ description  │
                       │ sort_order   │
                       │ parent_id ──────── (self-referential)
                       │ in_progress_since
                       │ viewed_output_at
                       │ tool_permissions   (JSON)
                       │ created_at   │
                       │ updated_at   │
                       └──┬───────────┘
                          │
        ┌─────────────────┼──────────────────┬──────────────────┐
        │ 1:N             │ 1:N              │ 1:N              │
┌───────┴────────┐ ┌──────┴───────┐ ┌────────┴─────────┐ ┌─────┴────────┐
│  agent_runs    │ │ file_refs    │ │ clarification_   │ │   skills     │
│                │ │              │ │ messages         │ │              │
│ id             │ │ id           │ │                  │ │ id           │
│ work_item_id   │ │ work_item_id │ │ id               │ │ project_id   │
│ skill_id       │ │ path         │ │ work_item_id     │ │ work_item_id │
│ prompt         │ │ label        │ │ role (user/asst) │ │ name         │
│ result         │ │ ref_type     │ │ content          │ │ prompt_template
│ status         │ │ drive_root_id│ │ created_at       │ │ integration_ids
│ session_id     │ └──────────────┘ └──────────────────┘ │ config       │
│ started_at     │                                       └──────────────┘
│ completed_at   │
└────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  integrations    │     │  drive_roots      │     │ work_item_       │
│                  │     │                   │     │ templates        │
│ id               │     │ id                │     │                  │
│ name             │     │ name              │     │ id               │
│ type (jira/etc)  │     │ path              │     │ project_id       │
│ base_url         │     │ description       │     │ name             │
│ auth_type        │     │ purpose (in/out)  │     │ template_data    │
│ auth_token (enc) │     │                   │     │ schedule_cron    │
│ config           │     └─────────┬─────────┘     │ schedule_enabled │
│ can_write        │               │               │ target_status_id │
│ is_active        │     ┌─────────┴─────────┐     │ last_triggered_at│
└──────────────────┘     │ project_drive_roots│     └──────────────────┘
                         │ work_item_drive_   │
                         │ roots              │     ┌──────────────────┐
                         └───────────────────┘     │ prompt_templates │
                                                    │                  │
                                                    │ id               │
                                                    │ project_id       │
                                                    │ name, template   │
                                                    │ variables (JSON) │
                                                    └──────────────────┘
```

### Tables (15 total)

| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| `projects` | Top-level workspace container | Has many statuses, work items, tags |
| `statuses` | Kanban columns (Backlog, In Progress, etc.) | Belongs to project |
| `work_items` | Individual tasks/cards | Belongs to project + status; self-referential parent_id |
| `tags` | Categorisation labels | Belongs to project |
| `work_item_tags` | Many-to-many join | Links work items to tags |
| `agent_runs` | Execution history for AI agent calls | Belongs to work item (optional) |
| `clarification_messages` | Chat between user and agent | Belongs to work item |
| `file_references` | Input/output file tracking | Belongs to work item |
| `drive_roots` | File system root directories | Global, linked to projects/work items |
| `project_drive_roots` | Project-level drive associations | Join table |
| `work_item_drive_roots` | Work-item-level drive overrides | Join table |
| `integrations` | External system credentials | Encrypted auth tokens |
| `skills` | Reusable agent capabilities | Scoped to global/project/work item |
| `prompt_templates` | Reusable prompt patterns | Scoped to global/project |
| `work_item_templates` | Saved task blueprints with optional scheduling | Cron-based automation |

### Migration Strategy

Migrations are sequential SQL files (`001_initial.sql` through `009_drive_root_purpose.sql`) applied in order. A `_migrations` table tracks which have been applied. The runner is idempotent — safe to call on every startup.

---

## Agent Execution Pipeline

This is the core of the system. When a work item is dragged to "In Progress", the following pipeline executes:

```
  User drags card to "In Progress"
          │
          ▼
  ┌─────────────────────────────────┐
  │  1. CONTEXT ASSEMBLY            │
  │                                 │
  │  • Work item title/description  │
  │  • Status name                  │
  │  • Tags                         │
  │  • File references (in/out)     │
  │  • Source/output folder paths   │
  │  • Clarification chat history   │
  │  • Previous agent run results   │
  │  • Integration data (if any)    │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │  2. TOOL PERMISSION RESOLUTION  │
  │                                 │
  │  Global defaults (enterpriseConfig)
  │        ↓ merge                  │
  │  Work-item overrides (JSON)     │
  │        ↓ filter                 │
  │  Enabled tool list              │
  │  e.g. [Read, Glob, Grep, Write]│
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │  3. AI PROVIDER CALL            │
  │                                 │
  │  System prompt: AlphaPM persona │
  │  User prompt: assembled context │
  │  Tools: enabled tool list       │
  │                                 │
  │  Provider selection:            │
  │  • claude-cli → Agent SDK      │
  │  • codex → Codex SDK           │
  │  • anthropic → HTTP API        │
  │  • openai → HTTP API           │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │  4. RESPONSE PARSING            │
  │                                 │
  │  Parse status directive:        │
  │  • [DONE] → task complete       │
  │  • [INPUT_REQUIRED] → needs help│
  │  • (none) → default to done     │
  │                                 │
  │  Extract file paths from output │
  │  • Backtick-quoted paths        │
  │  • Bold markdown paths          │
  │  • Validated against filesystem │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │  5. POST-PROCESSING             │
  │                                 │
  │  • Transition work item status  │
  │  • Generate title (if blank)    │
  │  • Register output files        │
  │  • Store clarification message  │
  │    (if INPUT_REQUIRED)          │
  │  • Handle write-back to         │
  │    integrations (if configured) │
  │  • Complete agent_run record    │
  └─────────────────────────────────┘
```

### Agent Persona

The default agent operates as an AI Product Manager persona with specific behavioural guidelines:

- **Evidence-first**: Every recommendation is grounded in source material. Gaps are explicitly flagged.
- **Structured output**: Uses headers, bullet points, and tables where they aid clarity.
- **Uncertainty protocol**: States when sources don't contain the answer, when data is stale, or when sources conflict.
- **Task summary**: Every completed task ends with a structured summary listing what was produced, sources used, gaps/caveats, and suggested follow-ons.

### Status Directive Protocol

The agent is instructed to end every response with exactly one directive:

```
[DONE]            — Task complete, output delivered
[INPUT_REQUIRED]  — Agent is blocked, needs human input
```

The system parses this directive and automatically transitions the work item's status.

---

## AI Provider Abstraction

The `providers.ts` module abstracts four AI backends behind a common interface:

```typescript
interface AIResponse {
  content: string;
  model: string;
  sessionId?: string;
  writtenFiles?: string[];
}

function callAI(messages: AIMessage[], allowedTools?: string[]): Promise<AIResponse>
```

### Provider Details

| Provider | SDK | Tool Access | Session Tracking | File Tracking |
|----------|-----|-------------|-----------------|---------------|
| **claude-cli** | @anthropic-ai/claude-agent-sdk | Full (Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch) | Yes | Yes |
| **codex** | @openai/codex-sdk | Codex native | No | No |
| **anthropic** | HTTP API | No | No | No |
| **openai** | HTTP API | No | No | No |

The Claude CLI provider is the most capable — it gives the agent actual filesystem access through tool use, enabling it to read input files, write deliverables, and browse directories. The API-only providers are limited to text generation.

### Configuration

```bash
AI_PROVIDER=claude-cli     # Provider selection
AI_API_KEY=sk-...          # API key (anthropic/openai providers)
AI_MODEL=claude-sonnet-4-5-20250514  # Model override
AI_MAX_TURNS=10            # Max conversation turns (claude-cli)
AI_BASE_URL=https://...    # Custom API endpoint
```

---

## Frontend Architecture

### Component Tree

```
App
├── AppShell (layout wrapper)
│   ├── Header (navigation, project info)
│   ├── Sidebar (project list, navigation)
│   └── <Outlet> (page content)
│
├── ProjectsPage (project list with create)
│
├── ProjectPage (main workspace)
│   ├── KanbanBoard / ListView (toggle via UI store)
│   │   ├── KanbanColumn × N (one per visible status)
│   │   │   └── KanbanCard × N (draggable work items)
│   │   └── DragDropContext (transition rules + agent triggering)
│   │
│   └── WorkItemDetail (right panel, 3 tabs)
│       ├── Define tab: title, description, files, skills, tool permissions
│       ├── Chat tab: ClarificationPanel (user ↔ agent messages)
│       └── Deliver tab: agent output, output files, file management
│
└── SettingsPage
    ├── AISettings (provider, model, max turns)
    ├── IntegrationSettings (CRUD + test connection)
    ├── SkillSettings (custom skill definitions)
    ├── DriveSettings (input/output directory config)
    ├── SourceSettings (data source management)
    ├── TemplateSettings (scheduled templates)
    ├── SecuritySettings (encryption config)
    └── LogSettings (event log viewer)
```

### State Management

**React Query** manages all server state with a 3-second polling interval on work items. This ensures the board updates near-real-time as agents complete work.

```
useWorkItems(projectId)       → GET /projects/:id/work-items  (3s refetch)
useCreateWorkItem()           → POST /projects/:id/work-items
useUpdateWorkItem()           → PUT /work-items/:id
useBulkUpdateWorkItems()      → PUT /work-items-bulk
useDeleteWorkItem()           → DELETE /work-items/:id
```

**Zustand** manages ephemeral UI state that doesn't need persistence:

```typescript
interface UIState {
  viewMode: 'kanban' | 'list';
  selectedWorkItemId: string | null;
  sidebarOpen: boolean;
  filters: { search: string; tagIds: string[] };
  settingsTab: string;
}
```

### Drag-and-Drop Rules

The Kanban board enforces specific transition rules to match the AI workflow:

```typescript
const ALLOWED_TRANSITIONS = {
  'Backlog':        ['In Progress'],
  'In Progress':    ['Backlog', 'Input Required'],
  'Input Required': ['In Progress', 'Done', 'Backlog'],
  // Done: no outward transitions (terminal state)
};
```

When a card is dropped in a new column:
1. **Backlog → In Progress**: Agent run is triggered automatically
2. **Input Required → In Progress**: Agent resumes with user's clarification
3. **Other transitions**: Status updated without agent trigger

Sort order within columns uses gaps of 1000 for efficient reordering without full recalculation.

---

## Integration System

### Plugin Architecture

Integration adapters follow a common interface and are registered in a plugin registry:

```typescript
interface IntegrationAdapter {
  type: string;
  testConnection(config): Promise<{ ok: boolean; message: string }>;
  fetchItem(config, itemId): Promise<NormalizedItem>;
  searchItems(config, query): Promise<NormalizedItem[]>;
  createItem?(config, data): Promise<WriteResult>;
  updateItem?(config, itemId, data): Promise<WriteResult>;
  addComment?(config, itemId, comment): Promise<WriteResult>;
}
```

All adapters normalise external data into a common `NormalizedItem` shape, so the agent receives consistent context regardless of source.

### Credential Security

Integration tokens are encrypted at rest:

```
User provides token → encrypt(AES-256-GCM) → stored in SQLite
                      ↓
                  scrypt(key, salt, 32) for key derivation
                      ↓
                  Format: iv:authTag:ciphertext (hex)
```

API responses return only masked tokens (`secr****5678`). The full token is decrypted only at the moment of making an external API call.

### Drive Root Hierarchy

File access is controlled through a three-level hierarchy:

```
Global drive roots (all projects)
    └── Project-level overrides
        └── Work-item-level overrides
```

Each level can specify separate `input` and `output` directories. The resolution logic handles each purpose independently — a work-item input override won't suppress a global output default.

---

## Security Architecture

### Layers

```
┌─────────────────────────────────────────────┐
│  HTTP Security (Helmet)                     │
│  Content-Security-Policy, X-Frame-Options,  │
│  Strict-Transport-Security, etc.            │
├─────────────────────────────────────────────┤
│  CORS (enterprise: origin-locked)           │
├─────────────────────────────────────────────┤
│  SSO Validation (enterprise: proxy headers) │
├─────────────────────────────────────────────┤
│  Input Validation (Zod schemas)             │
├─────────────────────────────────────────────┤
│  Tool Permissions (global + per-item)       │
├─────────────────────────────────────────────┤
│  Credential Encryption (AES-256-GCM)        │
├─────────────────────────────────────────────┤
│  Error Masking (enterprise: no stack traces)│
└─────────────────────────────────────────────┘
```

### Enterprise Mode

When `ENTERPRISE_MODE=true`:

| Control | Default (dev) | Enterprise |
|---------|--------------|------------|
| Tool permissions | All enabled | Read, Glob, Grep only |
| CORS origins | Open | Localhost + configured origins |
| Error responses | Include message | Generic "Internal server error" |
| Encryption key | Default dev key | Must be set (fatal if missing) |
| SSO validation | Disabled | Ready for proxy integration |

---

## Template Scheduling

Work item templates can be scheduled to create tasks automatically:

```
Template definition:
  name: "Weekly Status Report"
  template_data: { title: "Status Report - {{date}}", description: "..." }
  schedule_cron: "0 9 * * 1"     ← Every Monday at 9am
  schedule_enabled: true
  target_status_id: <backlog-status-id>

                    ↓ node-cron fires

New work item created in Backlog
  → User drags to In Progress (or automation does)
  → Agent generates the report
  → Card moves to Done
```

The scheduler manages job lifecycle — starting, refreshing, and stopping cron jobs as templates are created, updated, or deleted.

---

## Event Logging

An in-memory audit log captures system events with a 100-entry circular buffer:

```typescript
interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: string;     // 'agent', 'audit', etc.
  message: string;
  detail?: string;    // Capped at 2,000 chars
}
```

The log is accessible through the Settings UI for debugging agent runs, tracking credential access, and monitoring system health. It is not persisted across restarts — it's a debugging aid, not an audit trail.

---

## Testing Strategy

### Approach

The test suite focuses on unit testing the business logic and data access layers where correctness matters most. External-facing layers (HTTP routes, AI provider calls, filesystem operations) are excluded from unit test coverage — they require integration tests.

### Test Infrastructure

- **Framework**: Vitest (fast, ESM-native, TypeScript-first)
- **Database tests**: In-memory SQLite with full schema applied per test
- **Mocking**: `vi.mock()` for module-level mocks (DB connection, UUID generation, encryption)
- **Frontend tests**: jsdom environment with @testing-library/jest-dom

### Coverage Scope

| Layer | Unit tested | Coverage |
|-------|-------------|----------|
| **db/models** (13 modules) | Yes | 98.1% statements |
| **lib** (crypto, config, keys, uuid) | Yes | 84.6% statements |
| **middleware** (errorHandler, ssoValidation) | Yes | 100% statements |
| **agent/prompts** | Yes | 100% statements |
| **integrations/registry** | Yes | 100% statements |
| **services/eventLog** | Yes | 100% statements |
| **db/connection** | Yes | 100% statements |
| Routes | No (integration test territory) | — |
| Integration adapters | No (external HTTP calls) | — |
| AI providers | No (external API calls) | — |
| agent/executor | No (orchestrates external calls) | — |

**Overall unit-testable code: 96.6% statements, 86.4% branches**

### Running Tests

```bash
cd packages/server && pnpm test           # 229 tests, ~1s
cd packages/web && pnpm test              # 21 tests, ~1s
cd packages/server && pnpm test:coverage  # With V8 coverage report
```
