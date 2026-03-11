import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate.js';
import { closeDb } from './db/connection.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initScheduler, stopScheduler } from './services/templateScheduler.js';

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

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Run migrations
runMigrations();

// Health check (before other routes to avoid /:id collision)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
