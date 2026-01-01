import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CommitMessageEditor } from './CommitMessageEditor';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';

export function CommitPanel() {
  const { currentRepo, status } = useRepositoryStore();
  const [message, setMessage] = useState('');
  const [amend, setAmend] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const stagedCount = status?.staged?.length ?? 0;
  const canCommit = (stagedCount > 0 || amend) && message.trim().length > 0;

  // Load last commit message when amend is toggled
  useEffect(() => {
    async function loadLastMessage() {
      if (amend && currentRepo) {
        try {
          const lastMessage = await tauriGitService.getLastCommitMessage(currentRepo.path);
          setMessage(lastMessage);
        } catch (error) {
          console.error('Failed to load last commit message:', error);
        }
      }
    }
    loadLastMessage();
  }, [amend, currentRepo]);

  const handleCommit = useCallback(async () => {
    if (!currentRepo || !canCommit) return;

    setIsCommitting(true);
    try {
      const hash = await tauriGitService.createCommit(currentRepo.path, message.trim(), amend);
      const shortHash = hash.slice(0, 7);
      toast.success(`Commit ${shortHash} created`);
      setMessage('');
      setAmend(false);
    } catch (error) {
      console.error('Failed to commit:', error);
      toast.error(`Commit failed: ${error}`);
    } finally {
      setIsCommitting(false);
    }
  }, [currentRepo, canCommit, message, amend]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canCommit && !isCommitting) {
        e.preventDefault();
        handleCommit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canCommit, isCommitting, handleCommit]);

  return (
    <div className="border-t p-3 space-y-3 flex-shrink-0">
      <CommitMessageEditor
        value={message}
        onChange={setMessage}
        disabled={isCommitting}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="amend"
            checked={amend}
            onCheckedChange={(checked) => setAmend(checked === true)}
            disabled={isCommitting}
          />
          <label
            htmlFor="amend"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Amend
          </label>
        </div>

        <Button
          onClick={handleCommit}
          disabled={!canCommit || isCommitting}
          size="sm"
        >
          {isCommitting ? 'Committing...' : amend ? 'Amend' : 'Commit'}
          {stagedCount > 0 && !amend && (
            <span className="ml-1.5 text-xs opacity-70">({stagedCount})</span>
          )}
        </Button>
      </div>
    </div>
  );
}
