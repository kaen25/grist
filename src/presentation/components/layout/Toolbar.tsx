import { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  GitBranch,
  Check,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRepositoryStore } from '@/application/stores';
import { useGitService, useLoading, useToggle } from '@/application/hooks';
import { useTheme } from '@/presentation/providers';
import { RepositorySelector } from '@/presentation/components/repository';
import { PushDialog, PullDialog, SshUnlockDialog, isSshKeyLockedError } from '@/presentation/components/remotes';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Branch } from '@/domain/entities';

export function Toolbar() {
  const { currentRepo, status, isRefreshing, triggerRefresh } = useRepositoryStore();
  const { refreshStatus } = useGitService();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [branches, setBranches] = useState<Branch[]>([]);
  //const [isLoadingBranches, setIsLoadingBranches] = useToggle();
  //const [isCheckingOut, setIsCheckingOut] = useToggle();
  //const [isFetching, setIsFetching] = useToggle();
  const [showPushDialog, setShowPushDialog] = useToggle();
  const [showPullDialog, setShowPullDialog] = useToggle();

  // SSH Key unlock state
  const [showUnlockDialog, setShowUnlockDialog] = useToggle();
  const [lockedKeyPath, setLockedKeyPath] = useState<string | null>(null);
  const pendingOperationRef = useRef<(() => Promise<void>) | null>(null);

  /*
  const loadBranches = useCallback(async () => {
    if (!currentRepo) return;
    setIsLoadingBranches(true);
    try {
      const loadedBranches = await tauriGitService.getBranches(currentRepo.path);
      setBranches(loadedBranches);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  }, [currentRepo]);
  */

  const [loadBranches, isLoadingBranches] = useLoading(async () => {
      if (!currentRepo) return;
      const loadedBranches = await tauriGitService.getBranches(currentRepo.path);
      setBranches(loadedBranches);
    },
    (error) => {
      console.error('Failed to load branches:', error);
    }
  );

  useEffect(() => {
    if (currentRepo) {
      loadBranches();
      refreshStatus(currentRepo.path);
    }
  }, [currentRepo?.path]);

  /*
  const handleCheckout = async (branch: Branch) => {
    if (!currentRepo || branch.is_current || branch.is_remote) return;
    setIsCheckingOut(true);
    try {
      await tauriGitService.checkoutBranch(currentRepo.path, branch.name);
      toast.success(`Switched to ${branch.name}`);
      await loadBranches();
      await refreshStatus(currentRepo.path);
    } catch (error) {
      toast.error(`Failed to checkout: ${error}`);
    } finally {
      setIsCheckingOut(false);
    }
  };
  */

  const [handleCheckout, isCheckingOut] = useLoading(async (branch: Branch) => {
    if (!currentRepo || branch.is_current || branch.is_remote) return;
    await tauriGitService.checkoutBranch(currentRepo.path, branch.name);
    toast.success(`Switched to ${branch.name}`);
    await loadBranches();
    await refreshStatus(currentRepo.path);
  }, (error) => {
    toast.error(`Failed to checkout: ${error}`);
  });

  // Helper to handle SSH key locked errors
  const handleSshKeyLocked = (error: unknown, retryOperation: () => Promise<void>) => {
    const keyPath = isSshKeyLockedError(error);
    if (keyPath) {
      setLockedKeyPath(keyPath);
      pendingOperationRef.current = retryOperation;
      setShowUnlockDialog(true);
      return true;
    }
    return false;
  };

  const handleUnlockSuccess = async () => {
    if (pendingOperationRef.current) {
      const operation = pendingOperationRef.current;
      pendingOperationRef.current = null;
      await operation();
    }
  };

  /*
  const handleFetch = async () => {
    if (!currentRepo) return;
    setIsFetching(true);
    try {
      await tauriGitService.fetch(currentRepo.path, undefined, true);
      toast.success('Fetch successful');
      triggerRefresh();
      await Promise.all([loadBranches(), refreshStatus(currentRepo.path)]);
    } catch (error) {
      if (!handleSshKeyLocked(error, handleFetch)) {
        toast.error(`Fetch failed: ${error}`);
      }
    } finally {
      setIsFetching(false);
    }
  };
  */

  const [handleFetch, isFetching] = useLoading(async () => {
    if (!currentRepo) return;
    await tauriGitService.fetch(currentRepo.path, undefined, true);
    toast.success('Fetch successful');
    triggerRefresh();
    await Promise.all([loadBranches(), refreshStatus(currentRepo.path)]);
  }, (error) => {
    if (!handleSshKeyLocked(error, handleFetch)) {
        toast.error(`Fetch failed: ${error}`);
      }
  });

  const handleRemoteSuccess = async () => {
    triggerRefresh();
    await loadBranches();
  };

  const localBranches = branches.filter((b) => !b.is_remote);
  const currentBranch = branches.find((b) => b.is_current);
  const currentBranchName = status?.branch ?? currentRepo?.branch ?? 'No branch';

  return (
    <header className="flex h-12 items-center gap-2 border-b px-4">
      <RepositorySelector />

      <Separator orientation="vertical" className="h-6" />

      <Button
        variant="ghost"
        size="sm"
        disabled={!currentRepo || isFetching}
        onClick={handleFetch}
      >
        <Download className={cn('mr-2 h-4 w-4', isFetching && 'animate-pulse')} />
        Fetch
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={!currentRepo}
        onClick={() => setShowPullDialog(true)}
      >
        <ArrowDown className="mr-2 h-4 w-4" />
        Pull
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={!currentRepo}
        onClick={() => setShowPushDialog(true)}
      >
        <ArrowUp className="mr-2 h-4 w-4" />
        Push
      </Button>

      <div className="flex-1" />

      {currentRepo && (
        <DropdownMenu onOpenChange={(open) => open && loadBranches()}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              disabled={isCheckingOut}
            >
              <GitBranch className="h-4 w-4" />
              <span className="font-medium">{currentBranchName}</span>
              {(currentBranch?.ahead ?? status?.ahead ?? 0) > 0 && (
                <span className="text-xs text-green-500">
                  ↑{currentBranch?.ahead ?? status?.ahead}
                </span>
              )}
              {(currentBranch?.behind ?? status?.behind ?? 0) > 0 && (
                <span className="text-xs text-red-500">
                  ↓{currentBranch?.behind ?? status?.behind}
                </span>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch branch
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-64">
              {isLoadingBranches ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  <RefreshCw className="mx-auto h-4 w-4 animate-spin" />
                </div>
              ) : localBranches.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No branches found
                </div>
              ) : (
                localBranches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.name}
                    onClick={() => handleCheckout(branch)}
                    disabled={branch.is_current}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer',
                      branch.is_current && 'bg-accent'
                    )}
                  >
                    {branch.is_current ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate flex-1">{branch.name}</span>
                    {(branch.ahead > 0 || branch.behind > 0) && (
                      <span className="text-xs shrink-0">
                        {branch.ahead > 0 && (
                          <span className="text-green-500">↑{branch.ahead}</span>
                        )}
                        {branch.behind > 0 && (
                          <span className="text-red-500">↓{branch.behind}</span>
                        )}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {currentRepo && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={async () => {
            triggerRefresh();
            await Promise.all([
              loadBranches(),
              refreshStatus(currentRepo.path),
            ]);
          }}
          disabled={isRefreshing || isLoadingBranches}
        >
          <RefreshCw
            className={cn(
              'h-4 w-4',
              (isRefreshing || isLoadingBranches) && 'animate-spin'
            )}
          />
        </Button>
      )}

      <Separator orientation="vertical" className="h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            Light
            {theme === 'light' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
            {theme === 'dark' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            System
            {theme === 'system' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PushDialog
        open={showPushDialog}
        onOpenChange={setShowPushDialog}
        onSuccess={handleRemoteSuccess}
      />

      <PullDialog
        open={showPullDialog}
        onOpenChange={setShowPullDialog}
        onSuccess={handleRemoteSuccess}
      />

      {lockedKeyPath && (
        <SshUnlockDialog
          open={showUnlockDialog}
          onOpenChange={setShowUnlockDialog}
          keyPath={lockedKeyPath}
          onUnlocked={handleUnlockSuccess}
          onCancelled={() => {
            pendingOperationRef.current = null;
          }}
        />
      )}
    </header>
  );
}
