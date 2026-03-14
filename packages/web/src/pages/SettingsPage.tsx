import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { AISettings } from '@/components/settings/AISettings';
import { SourceSettings } from '@/components/settings/SourceSettings';
import { IntegrationSettings } from '@/components/settings/IntegrationSettings';
import { SkillSettings } from '@/components/settings/SkillSettings';
import { PromptTemplateSettings } from '@/components/settings/PromptTemplateSettings';
import { TemplateSettings } from '@/components/settings/TemplateSettings';
import { LogSettings } from '@/components/settings/LogSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'ai', label: 'AI' },
  { id: 'sources', label: 'Input / Output' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'skills', label: 'Skills' },
  { id: 'templates', label: 'Templates' },
  { id: 'security', label: 'Security' },
  { id: 'logs', label: 'Logs' },
];

export function SettingsPage() {
  const { settingsTab, setSettingsTab } = useUIStore();
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} title="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">Settings</h2>
          </div>

          <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  settingsTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {settingsTab === 'ai' && <AISettings />}
          {settingsTab === 'sources' && <SourceSettings />}
          {settingsTab === 'integrations' && <IntegrationSettings />}
          {settingsTab === 'skills' && <SkillSettings />}
          {settingsTab === 'prompts' && <PromptTemplateSettings />}
          {settingsTab === 'templates' && <TemplateSettings />}
          {settingsTab === 'security' && <SecuritySettings />}
          {settingsTab === 'logs' && <LogSettings />}
        </div>
      </div>
    </>
  );
}
