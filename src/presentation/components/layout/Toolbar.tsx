import { RefreshCw, ArrowDown, ArrowUp, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRepositoryStore } from '@/application/stores';
import { useTheme } from '@/presentation/providers';
import { RepositorySelector } from '@/presentation/components/repository';
import { cn } from '@/lib/utils';

export function Toolbar() {
  const { currentRepo, status, isRefreshing } = useRepositoryStore();
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <header className="flex h-12 items-center gap-2 border-b px-4">
      <RepositorySelector />

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
    </header>
  );
}
