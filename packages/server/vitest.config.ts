import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/test/**',
        'src/routes/**',           // Express route handlers (integration test territory)
        'src/integrations/jira.ts',  // External HTTP adapters
        'src/integrations/aha.ts',
        'src/integrations/github.ts',
        'src/integrations/custom.ts',
        'src/integrations/types.ts', // Pure type definitions
        'src/agent/providers.ts',    // External AI provider calls
        'src/agent/executor.ts',     // Heavy external AI integration
        'src/services/driveService.ts', // File system operations
        'src/services/templateScheduler.ts', // Cron scheduling (integration)
        'src/db/migrate.ts',         // Runtime file reading
      ],
    },
  },
});
