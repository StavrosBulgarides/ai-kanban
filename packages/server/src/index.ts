import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { runMigrations } from './db/migrate.js';
import { closeDb } from './db/connection.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initScheduler, stopScheduler } from './services/templateScheduler.js';
import { isEnterprise, getConfig, validateStartup } from './lib/enterpriseConfig.js';

import projectsRouter from './routes/projects.js';
import statusesRouter from './routes/statuses.js';
import workItemsRouter from './routes/workItems.js';
import tagsRouter from './routes/tags.js';
import drivesRouter from './routes/drives.js';
import integrationsRouter from './routes/integrations.js';
import skillsRouter from './routes/skills.js';
import promptTemplatesRouter from './routes/promptTemplates.js';
import agentRouter from './routes/agent.js';
import templatesRouter from './routes/templates.js';
import aiConfigRouter from './routes/aiConfig.js';
import clarificationsRouter from './routes/clarifications.js';
import { getLog, clearLog } from './services/eventLog.js';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Security headers (always-on)
app.use(helmet());

// CORS
if (isEnterprise()) {
  const config = getConfig();
  app.use(cors({
    origin: config.allowedOrigins,
    credentials: true,
  }));
} else {
  app.use(cors({ origin: true, credentials: true }));
}

app.use(express.json({ limit: '10mb' }));

// Run migrations
runMigrations();

// Startup validation (after migrations)
validateStartup();

// Health check (before other routes to avoid /:id collision)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Config endpoint (no sensitive data)
app.get('/api/config', (_req, res) => {
  const config = getConfig();
  res.json({
    enterpriseMode: config.enterpriseMode,
    defaultToolPermissions: config.defaultToolPermissions,
    features: {
      allowFileOpen: config.enterpriseMode ? config.allowFileOpen : true,
    },
  });
});

// Event log
app.get('/api/logs', (_req, res) => res.json(getLog()));
app.delete('/api/logs', (_req, res) => {
  if (isEnterprise()) {
    res.status(403).json({ error: 'Log deletion is disabled in enterprise mode' });
    return;
  }
  clearLog();
  res.json({ ok: true });
});

// Routes
app.use('/api', statusesRouter);
app.use('/api', workItemsRouter);
app.use('/api', tagsRouter);
app.use('/api', drivesRouter);
app.use('/api', integrationsRouter);
app.use('/api', skillsRouter);
app.use('/api', promptTemplatesRouter);
app.use('/api', agentRouter);
app.use('/api', templatesRouter);
app.use('/api', aiConfigRouter);
app.use('/api', clarificationsRouter);
// Projects last (has /:id wildcard)
app.use('/api/projects', projectsRouter);

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  initScheduler();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  stopScheduler();
  closeDb();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopScheduler();
  closeDb();
  server.close();
  process.exit(0);
});
