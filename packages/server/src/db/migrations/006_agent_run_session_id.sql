-- Store Claude CLI session ID for each agent run
ALTER TABLE agent_runs ADD COLUMN session_id TEXT;
