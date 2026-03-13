# AI Kanban

**An AI-native task automation platform that brings autonomous agents into everyday knowledge work.**

AI Kanban reimagines the traditional Kanban board as an interface between humans and AI agents. Instead of tracking what *people* are doing, it orchestrates what *agents* are doing — with humans providing direction, context, and judgement at the points where it matters most.

---

## The Problem

AI coding assistants have transformed software development. But most professional work isn't coding. Product managers write PRDs, analyse competitor landscapes, and synthesise user research. Project managers track dependencies, draft status reports, and chase down blockers. Analysts build financial models, write investment memos, and produce market assessments.

These knowledge workers face the same fundamental challenge: they have more tasks than time, and many of those tasks follow patterns that an AI agent could handle at scale — if there were a structured way to delegate, monitor, and receive the output.

Today's options are limited:

- **Chat interfaces** require you to babysit each task in real-time
- **Automation tools** handle rigid workflows but can't reason about ambiguous work
- **AI assistants** help in the moment but don't maintain state across tasks

AI Kanban fills this gap. It gives knowledge workers a familiar visual interface (the Kanban board) backed by autonomous AI agents that pick up work, execute it, and deliver results — or ask for clarification when they're stuck.

---

## How It Works

### The Four-Column Workflow

```
┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────┐
│ BACKLOG  │───>│ IN PROGRESS  │───>│ INPUT REQUIRED │───>│   DONE   │
│          │    │              │    │                │    │          │
│ Tasks    │    │ Agent is     │    │ Agent needs    │    │ Output   │
│ waiting  │    │ working      │    │ your input     │    │ delivered│
│ to start │    │ autonomously │    │ to continue    │    │          │
└──────────┘    └──────────────┘    └────────────────┘    └──────────┘
```

1. **Define** — Drop a task into Backlog with a description, attach relevant files or data sources, and optionally configure which tools the agent can use.

2. **Trigger** — Drag the card to In Progress. The AI agent picks it up immediately, reads the context, and begins working.

3. **Collaborate** — If the agent needs clarification, the card moves to Input Required. A chat interface lets you answer questions. Drag it back to In Progress and the agent resumes with your input.

4. **Receive** — When complete, the card lands in Done. The Deliver tab shows the agent's output, any files it generated, sources it cited, and gaps it flagged.

### What Makes This Different

- **Fire-and-forget execution** — You don't watch the agent work. Set the task, move on, come back when it's done.
- **Structured handoffs** — The agent doesn't guess when it's stuck. It moves itself to Input Required and tells you exactly what it needs.
- **File-aware** — Input and output directories let the agent read source material and write deliverables to specific locations.
- **Multi-provider** — Swap between Claude, GPT, Codex, or direct API calls depending on the task.
- **Scheduled automation** — Cron-based templates create recurring tasks automatically (e.g., "Every Monday at 9am, generate a weekly status report").
- **Integration-ready** — Pull context from Jira, GitHub, Aha!, or custom HTTP APIs so the agent works with your existing data.

---

## Use Cases

### Product Management

| Task | What the Agent Does |
|------|-------------------|
| **Competitor analysis** | Reads competitor documentation, pricing pages, and changelog data from attached sources. Produces structured comparison matrices with citations. |
| **PRD drafting** | Takes a feature brief and user research documents as input. Generates a complete PRD following your team's template, including user stories, acceptance criteria, and edge cases. |
| **Release notes** | Pulls merged PRs and resolved tickets from GitHub/Jira integrations. Synthesises customer-facing release notes grouped by theme. |
| **User feedback synthesis** | Processes NPS surveys, support tickets, or interview transcripts. Identifies patterns, clusters feedback by theme, and recommends priority actions. |
| **Market sizing** | Given a target segment description and data sources, produces TAM/SAM/SOM estimates with methodology and assumptions clearly stated. |
| **Feature prioritisation** | Takes a backlog of feature requests with usage data. Applies RICE/ICE scoring and produces a ranked recommendation with rationale. |

### Project Management

| Task | What the Agent Does |
|------|-------------------|
| **Status reports** | Aggregates data from connected project tools. Produces weekly/monthly status reports with milestones, risks, and blockers. Schedule it to run every Monday morning automatically. |
| **Risk assessment** | Reviews project plans, timelines, and dependency data. Identifies risks, assesses likelihood and impact, and suggests mitigations. |
| **Meeting prep** | Reads previous meeting notes, open action items, and recent updates. Generates an agenda with context for each item. |
| **Dependency mapping** | Analyses work items across projects to identify cross-team dependencies and potential scheduling conflicts. |
| **Retrospective analysis** | Processes retrospective notes from multiple sprints. Identifies recurring themes, tracks whether previous action items were addressed, and suggests systemic improvements. |
| **Stakeholder updates** | Takes raw project data and produces tailored updates for different audiences (executive summary vs. technical detail). |

### Research & Analysis

| Task | What the Agent Does |
|------|-------------------|
| **Literature review** | Reads academic papers or industry reports from attached directories. Produces structured summaries with key findings, methodology notes, and relevance assessments. |
| **Data analysis** | Takes CSV/Excel data sources and a research question. Performs analysis, generates insights, and produces formatted reports. |
| **Competitive intelligence** | Monitors competitor documentation and produces change summaries highlighting new features, pricing changes, or positioning shifts. |
| **Due diligence** | Processes company documentation, financial statements, and market data. Produces structured assessment against defined criteria. |
| **Policy review** | Reads regulatory documents or internal policies. Summarises key requirements, identifies compliance gaps, and recommends actions. |

### Content & Communications

| Task | What the Agent Does |
|------|-------------------|
| **Blog post drafting** | Takes a topic brief, target audience, and reference materials. Produces a draft with proper structure, citations, and SEO considerations. |
| **Proposal writing** | Reads RFP requirements and company capability documents. Produces tailored proposal sections addressing each requirement. |
| **Documentation** | Takes technical specifications or process descriptions. Produces user-facing documentation with examples and troubleshooting guides. |
| **Email campaigns** | Given a product update and audience segments, drafts targeted email copy with appropriate tone and calls to action. |

### Operations & Process

| Task | What the Agent Does |
|------|-------------------|
| **SOP creation** | Observes process documentation and interview notes. Produces step-by-step standard operating procedures with decision trees for edge cases. |
| **Vendor evaluation** | Reads vendor proposals, pricing sheets, and capability matrices. Produces comparative analysis with scoring against defined criteria. |
| **Budget analysis** | Processes financial data and spending reports. Identifies trends, flags anomalies, and produces variance analysis. |
| **Compliance checking** | Reviews documents against regulatory requirements or internal standards. Produces gap analysis with specific citations. |

---

## Architecture

AI Kanban is a full-stack TypeScript monorepo. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical breakdown.

```
ai-kanban/
├── packages/
│   ├── server/          Express API + SQLite + Agent orchestration
│   └── web/             React SPA + Kanban UI
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS 4 |
| **State** | TanStack React Query (server state), Zustand (UI state) |
| **Drag & Drop** | @hello-pangea/dnd |
| **Backend** | Express.js, TypeScript |
| **Database** | SQLite (better-sqlite3, WAL mode) |
| **AI Agents** | Claude Agent SDK, Codex SDK, Anthropic API, OpenAI API |
| **Scheduling** | node-cron |
| **Validation** | Zod |
| **Security** | AES-256-GCM encryption, Helmet, CORS, SSO-ready |

---

## Project Stats

| Metric | Value |
|--------|-------|
| **Total source files** | 95 TypeScript/TSX files |
| **Application code** | 7,655 lines |
| — Server (API, models, agents) | 3,856 lines across 46 files |
| — Web (UI, hooks, stores) | 3,799 lines across 49 files |
| **Test code** | 2,457 lines across 26 test files |
| **Test count** | 250 unit tests (229 server + 21 web) |
| **Test coverage** | 96.6% statements, 86.4% branches (server unit-testable code) |
| **Database schema** | 15 tables, 9 migrations, 183 lines SQL |
| **API endpoints** | 76 REST endpoints (28 GET, 25 POST, 10 PUT, 13 DELETE) |
| **React components** | 25 components |
| **AI providers** | 4 (Claude CLI, Codex, Anthropic API, OpenAI API) |
| **Integration adapters** | 4 (Jira, GitHub, Aha!, Custom HTTP) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
git clone <repository-url>
cd ai-kanban
pnpm install
```

### Development

```bash
pnpm dev
```

This starts both the API server (port 3001) and the web UI (Vite dev server) concurrently.

### Environment Variables

```bash
# AI Provider Configuration
AI_PROVIDER=claude-cli          # claude-cli | codex | anthropic | openai
AI_API_KEY=your-api-key         # Required for anthropic/openai providers
AI_MODEL=claude-sonnet-4-5-20250514  # Model override
AI_MAX_TURNS=10                 # Max agent conversation turns

# Database
DATABASE_PATH=./data/kanban.db  # SQLite database location

# Security
ENCRYPTION_KEY=your-secret-key  # See "Encryption Key" section below
ENCRYPTION_SALT=your-salt       # Encryption salt

# Enterprise Mode
ENTERPRISE_MODE=true            # Enables restricted defaults
ALLOWED_ORIGINS=https://app.example.com  # CORS origins
DEFAULT_TOOL_PERMISSIONS=Read,Glob,Grep  # Restrict agent tools
ENTERPRISE_SSO_VALIDATION=true  # Enable SSO proxy validation
ALLOW_FILE_OPEN=true            # Allow opening files from UI
```

### Running Tests

```bash
# Server unit tests
cd packages/server && pnpm test

# Web unit tests
cd packages/web && pnpm test

# Server tests with coverage
cd packages/server && pnpm test:coverage
```

### Building for Production

```bash
pnpm build
cd packages/server && pnpm start
```

---

## Security Model

AI Kanban includes layered security controls suitable for enterprise deployment:

- **Credential encryption** — Integration tokens (Jira, GitHub, etc.) are encrypted at rest using AES-256-GCM with scrypt key derivation. Tokens are never exposed in API responses; only masked versions are returned.
- **Tool permissions** — Global defaults control which tools agents can access. Per-work-item overrides allow further restriction (e.g., disable `Bash` and `Write` for research-only tasks).
- **Enterprise mode** — Activates restrictive defaults: read-only tool permissions, CORS origin locking, error message sanitisation, and SSO validation middleware.
- **Input validation** — All API inputs are validated with Zod schemas before processing.
- **Helmet** — Standard HTTP security headers applied to all responses.

### Encryption Key

The `ENCRYPTION_KEY` is used to encrypt integration credentials (Jira tokens, GitHub PATs, etc.) at rest using AES-256-GCM.

**For local development**, you don't need to change it. The app uses a built-in default dev key, which is fine for experimentation.

**You should set a real key if:**
- You enable **enterprise mode** (`ENTERPRISE_MODE=true`) — the server will refuse to start with the default key
- You store **real integration credentials** and want them properly encrypted

To generate a production key:

```bash
openssl rand -base64 32
```

Paste the output into your `.env`:

```bash
ENCRYPTION_KEY=your-generated-random-key-here
```

If you change the key after credentials have already been stored, existing encrypted tokens will become unreadable and will need to be re-entered.

---

## Design Principles

1. **The human decides what; the agent decides how.** Users define the task and provide context. The agent chooses its approach, executes, and delivers.

2. **Structured uncertainty.** When the agent doesn't know something, it doesn't guess — it moves the card to Input Required and asks a specific question. This keeps humans in the loop at exactly the right moments.

3. **Evidence first.** The agent cites its sources, flags gaps, and states when data is stale or conflicting. Output quality depends on transparency, not confidence.

4. **Familiar interface, new capability.** Kanban boards are understood by every PM and project manager. The learning curve is the tool, not the workflow.

5. **Progressive automation.** Start with ad-hoc tasks. Graduate to scheduled templates. Build up a library of reusable skills. Automation grows with trust.

---

## License

[Add licence here]
