import { Header } from '@/components/layout/Header';
import { DriveSettings } from '@/components/settings/DriveSettings';
import { IntegrationSettings } from '@/components/settings/IntegrationSettings';
import { SkillSettings } from '@/components/settings/SkillSettings';
import { TemplateSettings } from '@/components/settings/TemplateSettings';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'drives', label: 'Drives' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'skills', label: 'Skills' },
  { id: 'templates', label: 'Templates' },
];

export function SettingsPage() {
  const { settingsTab, setSettingsTab } = useUIStore();

  return (
    <>
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <h2 className="text-2xl font-bold mb-4">Settings</h2>

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

          {settingsTab === 'drives' && <DriveSettings />}
          {settingsTab === 'integrations' && <IntegrationSettings />}
          {settingsTab === 'skills' && <SkillSettings />}
          {settingsTab === 'templates' && <TemplateSettings />}
        </div>
      </div>
    </>
  );
}
