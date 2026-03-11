import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';
import { encrypt, decrypt } from '../../lib/crypto.js';

export interface Integration {
  id: string;
  name: string;
  type: string;
  base_url: string;
  auth_type: string;
  auth_token: string;
  config: string;
  is_active: number;
  can_write: number;
  created_at: string;
  updated_at: string;
}

export interface IntegrationPublic extends Omit<Integration, 'auth_token'> {
  auth_token_masked: string;
}

function maskToken(token: string): string {
  if (token.length <= 8) return '****';
  return token.substring(0, 4) + '****' + token.substring(token.length - 4);
}

function toPublic(integration: Integration): IntegrationPublic {
  const { auth_token, ...rest } = integration;
  let decrypted = '';
  try { decrypted = decrypt(auth_token); } catch { decrypted = auth_token; }
  return { ...rest, auth_token_masked: maskToken(decrypted) };
}

export function listIntegrations(): IntegrationPublic[] {
  const rows = getDb().prepare('SELECT * FROM integrations ORDER BY name').all() as Integration[];
  return rows.map(toPublic);
}

export function getIntegration(id: string): Integration | undefined {
  return getDb().prepare('SELECT * FROM integrations WHERE id = ?').get(id) as Integration | undefined;
}

export function getIntegrationDecrypted(id: string): (Integration & { decrypted_token: string }) | undefined {
  const row = getIntegration(id);
  if (!row) return undefined;
  let decrypted_token = '';
  try { decrypted_token = decrypt(row.auth_token); } catch { decrypted_token = row.auth_token; }
  return { ...row, decrypted_token };
}

export function createIntegration(data: {
  name: string;
  type: string;
  base_url?: string;
  auth_type?: string;
  auth_token: string;
  config?: string;
  can_write?: boolean;
}): IntegrationPublic {
  const id = newId();
  const now = new Date().toISOString();
  const encryptedToken = encrypt(data.auth_token);

  getDb().prepare(`
    INSERT INTO integrations (id, name, type, base_url, auth_type, auth_token, config, can_write, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.type, data.base_url || '', data.auth_type || 'pat',
    encryptedToken, data.config || '{}', data.can_write ? 1 : 0, now, now
  );

  return toPublic(getIntegration(id)!);
}

export function updateIntegration(id: string, data: {
  name?: string;
  base_url?: string;
  auth_type?: string;
  auth_token?: string;
  config?: string;
  is_active?: boolean;
  can_write?: boolean;
}): IntegrationPublic | undefined {
  const existing = getIntegration(id);
  if (!existing) return undefined;

  const token = data.auth_token ? encrypt(data.auth_token) : existing.auth_token;

  getDb().prepare(`
    UPDATE integrations SET name = ?, base_url = ?, auth_type = ?, auth_token = ?, config = ?, is_active = ?, can_write = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.name ?? existing.name, data.base_url ?? existing.base_url,
    data.auth_type ?? existing.auth_type, token,
    data.config ?? existing.config,
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
    data.can_write !== undefined ? (data.can_write ? 1 : 0) : existing.can_write,
    new Date().toISOString(), id
  );

  return toPublic(getIntegration(id)!);
}

export function deleteIntegration(id: string): boolean {
  return getDb().prepare('DELETE FROM integrations WHERE id = ?').run(id).changes > 0;
}
