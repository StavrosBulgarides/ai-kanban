import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { fetchSkills, executeSkill, runAgent } from '@/api/skills';
import type { Skill, AgentRun } from '@/types/models';

interface SkillsPanelProps {
  workItemId: string;
  projectId: string;
}

export function SkillsPanel({ workItemId, projectId }: SkillsPanelProps) {
  const [adHocPrompt, setAdHocPrompt] = useState('');
  const [runResult, setRunResult] = useState<AgentRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: skills } = useQuery({
    queryKey: ['skills', { workItemId }],
    queryFn: () => fetchSkills({ workItemId }),
  });

  const qc = useQueryClient();

  const handleExecuteSkill = async (skill: Skill) => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const result = await executeSkill(skill.id, { work_item_id: workItemId });
      setRunResult(result);
      qc.invalidateQueries({ queryKey: ['agent-runs', workItemId] });
    } finally {
      setIsRunning(false);
    }
  };

  const handleAdHoc = async () => {
    if (!adHocPrompt.trim()) return;
    setIsRunning(true);
    setRunResult(null);
    try {
      const result = await runAgent({ prompt: adHocPrompt, work_item_id: workItemId });
      setRunResult(result);
      setAdHocPrompt('');
      qc.invalidateQueries({ queryKey: ['agent-runs', workItemId] });
    } finally {
      setIsRunning(false);
    }
  };

  const globalSkills = skills?.filter((s) => !s.project_id && !s.work_item_id) || [];
  const projectSkills = skills?.filter((s) => s.project_id && !s.work_item_id) || [];
  const itemSkills = skills?.filter((s) => s.work_item_id === workItemId) || [];

  return (
    <div className="space-y-4">
      {/* Ad-hoc agent prompt */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Ask Agent</label>
        <Textarea
          value={adHocPrompt}
          onChange={(e) => setAdHocPrompt(e.target.value)}
          placeholder="Ask the agent anything about this work item..."
          rows={3}
        />
        <Button
          size="sm"
          className="mt-1 w-full"
          onClick={handleAdHoc}
          disabled={isRunning || !adHocPrompt.trim()}
        >
          <MessageSquare className="h-3 w-3" />
          {isRunning ? 'Running...' : 'Run'}
        </Button>
      </div>

      {/* Available skills */}
      {[
        { label: 'Item Skills', skills: itemSkills },
        { label: 'Project Skills', skills: projectSkills },
        { label: 'Global Skills', skills: globalSkills },
      ].map(({ label, skills: group }) =>
        group.length > 0 ? (
          <div key={label}>
            <span className="text-xs font-medium text-gray-500 mb-1 block">{label}</span>
            <div className="space-y-1">
              {group.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-2"
                >
                  <div>
                    <div className="text-sm font-medium">{skill.name}</div>
                    {skill.description && <div className="text-xs text-gray-500">{skill.description}</div>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExecuteSkill(skill)}
                    disabled={isRunning}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}

      {/* Run result */}
      {runResult && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge>{runResult.status}</Badge>
          </div>
          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {runResult.result}
          </pre>
        </div>
      )}
    </div>
  );
}
