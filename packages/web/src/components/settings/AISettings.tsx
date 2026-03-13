import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, AlertCircle, Cpu, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { fetchAIConfig, updateAIConfig, refreshAccount } from '@/api/aiConfig';

const PROVIDERS = [
  {
    value: 'claude-cli',
    label: 'Claude Code (Subscription)',
    description: 'Uses your Claude subscription via the Agent SDK. No API key needed.',
    loginCmd: 'claude login',
    icon: Cpu,
  },
  {
    value: 'codex',
    label: 'Codex (ChatGPT Enterprise / SSO)',
    description: 'Uses OpenAI Codex CLI with ChatGPT Enterprise SSO authentication. No API key needed.',
    loginCmd: 'codex login',
    icon: Terminal,
  },
  {
    value: 'anthropic',
    label: 'Anthropic API',
    description: 'Direct API calls to Anthropic. Requires an API key.',
    loginCmd: null,
    icon: null,
  },
  {
    value: 'openai',
    label: 'OpenAI API',
    description: 'Direct API calls to OpenAI. Requires an API key.',
    loginCmd: null,
    icon: null,
  },
];

function planBadgeColor(plan?: string): string {
  if (!plan) return '#6b7280';
  const lower = plan.toLowerCase();
  if (lower.includes('max') || lower.includes('enterprise')) return '#8b5cf6';
  if (lower.includes('pro') || lower.includes('plus')) return '#3b82f6';
  if (lower.includes('team') || lower.includes('business')) return '#10b981';
  return '#3b82f6';
}

export function AISettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['ai-config'], queryFn: fetchAIConfig });
  const [form, setForm] = useState({ provider: '', model: '', maxTurns: 25, apiKey: '', baseUrl: '' });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        provider: data.config.provider,
        model: data.config.model,
        maxTurns: data.config.maxTurns,
        apiKey: '',
        baseUrl: data.config.baseUrl,
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        provider: form.provider,
        model: form.model,
        maxTurns: form.maxTurns,
      };
      if (needsApiKey) {
        if (form.apiKey) body.apiKey = form.apiKey;
        body.baseUrl = form.baseUrl;
      }
      return updateAIConfig(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-config'] });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const refreshMut = useMutation({
    mutationFn: refreshAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-config'] }),
  });

  const update = (field: string, value: string | number) => {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400 py-6 text-center">Loading AI configuration...</div>;
  }

  const account = data?.account;
  const needsApiKey = form.provider === 'anthropic' || form.provider === 'openai';
  const isSubscriptionProvider = form.provider === 'claude-cli' || form.provider === 'codex';
  const currentProviderDef = PROVIDERS.find(p => p.value === data?.config.provider);

  return (
    <div className="space-y-6">
      {/* Subscription / Account Info — shown for claude-cli and codex */}
      {isSubscriptionProvider && data?.config.provider === form.provider && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {form.provider === 'codex'
                ? <><Terminal className="h-4 w-4 text-green-500" /> Codex / ChatGPT Enterprise</>
                : <><Cpu className="h-4 w-4 text-blue-500" /> Claude Subscription</>
              }
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
            >
              <RefreshCw className={`h-3 w-3 ${refreshMut.isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {account ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Connected</span>
                {account.authMethod && (
                  <span className="text-xs text-gray-400">via {account.authMethod}</span>
                )}
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {account.email && (
                  <>
                    <span className="text-gray-500">Email</span>
                    <span>{account.email}</span>
                  </>
                )}
                {account.subscriptionType && (
                  <>
                    <span className="text-gray-500">Plan</span>
                    <span className="flex items-center gap-2">
                      <Badge color={planBadgeColor(account.subscriptionType)}>
                        {account.subscriptionType}
                      </Badge>
                    </span>
                  </>
                )}
                {account.organization && (
                  <>
                    <span className="text-gray-500">Organization</span>
                    <span>{account.organization}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Not connected. Run{' '}
                <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                  {currentProviderDef?.loginCmd || 'login'}
                </code>{' '}
                in your terminal to authenticate.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Provider Selection */}
      <div>
        <h3 className="text-sm font-semibold mb-2">AI Provider</h3>
        <div className="space-y-2">
          {PROVIDERS.map(p => (
            <label
              key={p.value}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                form.provider === p.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={p.value}
                checked={form.provider === p.value}
                onChange={() => update('provider', p.value)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-gray-500">{p.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* SSO setup instructions for Codex */}
      {form.provider === 'codex' && !account && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">Enterprise SSO Setup</h4>
          <ol className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5 list-decimal list-inside">
            <li>Install Codex CLI: <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-xs">npm install -g @openai/codex</code></li>
            <li>Authenticate with your enterprise SSO: <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-xs">codex login</code></li>
            <li>This will open your browser for SSO sign-in through your organization's identity provider</li>
            <li>Once authenticated, click <strong>Refresh</strong> above to verify the connection</li>
          </ol>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Your admin must enable Codex access in ChatGPT Enterprise workspace settings.
            For headless environments, use <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-xs">codex login --device-auth</code>.
          </p>
        </div>
      )}

      {/* API Key (only for direct API providers) */}
      {needsApiKey && (
        <div>
          <label className="block text-sm font-semibold mb-1">API Key</label>
          <Input
            type="password"
            placeholder={data?.config.apiKeySet ? 'Key is set (enter new value to replace)' : 'Enter API key'}
            value={form.apiKey}
            onChange={e => update('apiKey', e.target.value)}
          />
          {data?.config.apiKeySet && !form.apiKey && (
            <p className="text-xs text-green-600 mt-1">API key is configured</p>
          )}
        </div>
      )}

      {/* Base URL (only for API providers) */}
      {needsApiKey && (
        <div>
          <label className="block text-sm font-semibold mb-1">Base URL (optional)</label>
          <Input
            placeholder={form.provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com'}
            value={form.baseUrl}
            onChange={e => update('baseUrl', e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Leave blank for default endpoint</p>
        </div>
      )}

      {/* Model */}
      <div>
        <label className="block text-sm font-semibold mb-1">Model (optional)</label>
        <Input
          placeholder={
            form.provider === 'claude-cli' ? 'Default (inherits from subscription)'
            : form.provider === 'codex' ? 'Default (e.g. gpt-5.1)'
            : form.provider === 'anthropic' ? 'claude-sonnet-4-20250514'
            : 'gpt-4o'
          }
          value={form.model}
          onChange={e => update('model', e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">Leave blank to use the default model for the selected provider</p>
      </div>

      {/* Max Turns — not applicable to Codex (it manages its own turns) */}
      {form.provider !== 'codex' && (
        <div>
          <label className="block text-sm font-semibold mb-1">Max Turns</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={form.maxTurns}
            onChange={e => update('maxTurns', parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum number of agentic turns per task execution</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => saveMut.mutate()}
          disabled={!dirty || saveMut.isPending}
        >
          {saveMut.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" /> Saved
          </span>
        )}
        {saveMut.isError && (
          <span className="text-sm text-red-500">
            Error: {(saveMut.error as Error).message}
          </span>
        )}
      </div>
    </div>
  );
}
