import { useState, useEffect, useCallback } from 'react';
import {
  FolderGit2,
  Clock,
  Archive,
  Settings,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Plus,
  Minus,
  Globe,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useUIStore, useRepositoryStore } from '@/application/stores';
import { useStagingActions, useLoading } from '@/application/hooks';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setCurrentView } = useUIStore();
  const { currentRepo } = useRepositoryStore();
  const { stageAll, unstageAll } = useStagingActions();

  const [executeFetch, isFetching] = useLoading(async () => {
    if (!currentRepo) return;
    await tauriGitService.fetch(currentRepo.path);
    toast.success('Fetch complete');
    window.dispatchEvent(new CustomEvent('grist:refresh'));
  }, (err) => toast.error(`Fetch failed: ${err}`));

  const [executePull, isPulling] = useLoading(async () => {
    if (!currentRepo) return;
    await tauriGitService.pull(currentRepo.path);
    toast.success('Pull complete');
    window.dispatchEvent(new CustomEvent('grist:refresh'));
  }, (err) => toast.error(`Pull failed: ${err}`));

  const [executePush, isPushing] = useLoading(async () => {
    if (!currentRepo) return;
    await tauriGitService.push(currentRepo.path);
    toast.success('Push complete');
  }, (err) => toast.error(`Push failed: ${err}`));

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void | Promise<void>) => {
    setOpen(false);
    command();
  }, []);

  const isLoading = isFetching || isPulling || isPushing;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => setCurrentView('status'))}>
            <FolderGit2 className="mr-2 h-4 w-4" />
            Go to Changes
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setCurrentView('history'))}>
            <Clock className="mr-2 h-4 w-4" />
            Go to History
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setCurrentView('remotes'))}>
            <Globe className="mr-2 h-4 w-4" />
            Go to Remotes
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setCurrentView('stash'))}>
            <Archive className="mr-2 h-4 w-4" />
            Go to Stash
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setCurrentView('settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            Go to Settings
          </CommandItem>
        </CommandGroup>

        {currentRepo && (
          <>
            <CommandGroup heading="Git Actions">
              <CommandItem
                disabled={isLoading}
                onSelect={() => runCommand(executeFetch)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch
              </CommandItem>
              <CommandItem
                disabled={isLoading}
                onSelect={() => runCommand(executePull)}
              >
                <ArrowDown className="mr-2 h-4 w-4" />
                Pull
              </CommandItem>
              <CommandItem
                disabled={isLoading}
                onSelect={() => runCommand(executePush)}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Push
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Staging">
              <CommandItem onSelect={() => runCommand(stageAll)}>
                <Plus className="mr-2 h-4 w-4" />
                Stage All
              </CommandItem>
              <CommandItem onSelect={() => runCommand(unstageAll)}>
                <Minus className="mr-2 h-4 w-4" />
                Unstage All
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
