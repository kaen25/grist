import { RefreshCw, ArrowDown, ArrowUp, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRepositoryStore } from '@/application/stores';
import { cn } from '@/lib/utils';

export function Toolbar() {
  const { currentRepo, status, isRefreshing } = useRepositoryStore();

  return (
    <header className="flex h-12 items-center gap-2 border-b px-4">
      <Button variant="ghost" size="sm">
        <FolderOpen className="mr-2 h-4 w-4" />
        Open
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="ghost" size="sm" disabled={!currentRepo}>
        <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
        Fetch
      </Button>

      <Button variant="ghost" size="sm" disabled={!currentRepo}>
        <ArrowDown className="mr-2 h-4 w-4" />
        Pull
      </Button>

      <Button variant="ghost" size="sm" disabled={!currentRepo}>
        <ArrowUp className="mr-2 h-4 w-4" />
        Push
      </Button>

      <div className="flex-1" />

      {currentRepo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {status?.branch ?? currentRepo.branch ?? 'No branch'}
          </span>
          {status && (status.ahead > 0 || status.behind > 0) && (
            <span>
              {status.ahead > 0 && `↑${status.ahead}`}
              {status.behind > 0 && `↓${status.behind}`}
            </span>
          )}
        </div>
      )}
    </header>
  );
}
