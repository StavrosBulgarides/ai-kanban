import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fetchClarifications, sendClarification } from '@/api/clarifications';
import { runAgent } from '@/api/skills';
import { useStatuses } from '@/hooks/useStatuses';
import { useUpdateWorkItem } from '@/hooks/useWorkItems';
import type { ClarificationMessage } from '@/types/models';
import { cn } from '@/lib/utils';

interface ClarificationPanelProps {
  workItemId: string;
  projectId: string;
}

export function ClarificationPanel({ workItemId, projectId }: ClarificationPanelProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { data: statuses } = useStatuses(projectId);
  const updateItem = useUpdateWorkItem(projectId);

  const { data: messages = [] } = useQuery({
    queryKey: ['clarifications', workItemId],
    queryFn: () => fetchClarifications(workItemId),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const result = await sendClarification(workItemId, input.trim());
      setInput('');
      setReady(result.ready);
      qc.setQueryData(['clarifications', workItemId], result.messages);
    } finally {
      setSending(false);
    }
  };

  const handleStartTask = () => {
    const inProgressStatus = statuses?.find(s => s.name === 'In Progress');
    if (!inProgressStatus) return;
    updateItem.mutate(
      { id: workItemId, status_id: inProgressStatus.id },
      {
        onSuccess: () => {
          setReady(false);
          qc.invalidateQueries({ queryKey: ['work-items'] });
          qc.invalidateQueries({ queryKey: ['work-item', workItemId] });
          // Trigger the agent to work on the task with full clarification context
          runAgent({
            prompt: 'Work on this task. Review all attached files, integration data, and skills. Complete the task described below.',
            work_item_id: workItemId,
          }).then(() => {
            qc.invalidateQueries({ queryKey: ['work-items'] });
            qc.invalidateQueries({ queryKey: ['work-item', workItemId] });
            qc.invalidateQueries({ queryKey: ['agent-runs', workItemId] });
            qc.invalidateQueries({ queryKey: ['file-references', workItemId] });
          }).catch(err => console.error('Failed to start agent:', err));
        },
      }
    );
  };

  const handleCompleteTask = () => {
    const doneStatus = statuses?.find(s => s.name === 'Done');
    if (!doneStatus) return;
    updateItem.mutate(
      { id: workItemId, status_id: doneStatus.id },
      {
        onSuccess: () => {
          setReady(false);
          qc.invalidateQueries({ queryKey: ['work-items'] });
          qc.invalidateQueries({ queryKey: ['work-item', workItemId] });
          qc.invalidateQueries({ queryKey: ['agent-runs', workItemId] });
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 p-1 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">No clarification messages yet</div>
        )}
        {messages.map((msg: ClarificationMessage) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
              msg.role === 'assistant'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 self-start mr-auto'
                : 'bg-blue-500 text-white self-end ml-auto'
            )}
          >
            {msg.content}
          </div>
        ))}
        {sending && (
          <div className="text-xs text-gray-400 italic px-1">Thinking...</div>
        )}
      </div>

      {ready && (
        <div className="flex gap-2 p-2 border-t border-gray-200 dark:border-gray-800">
          <Button onClick={handleStartTask} size="sm" className="flex-1 gap-2">
            <Play className="h-3 w-3" />
            Start Task
          </Button>
          <Button onClick={handleCompleteTask} size="sm" variant="outline" className="flex-1 gap-2">
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </Button>
        </div>
      )}

      <div className="flex gap-2 p-2 border-t border-gray-200 dark:border-gray-800">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Button size="icon" className="h-8 w-8" onClick={handleSend} disabled={!input.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
