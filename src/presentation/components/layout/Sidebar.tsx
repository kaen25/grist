import { FolderGit2, Clock, GitBranch, Archive, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUIStore, type ViewType } from '@/application/stores';
import { cn } from '@/lib/utils';

const navItems: { id: ViewType; icon: typeof FolderGit2; label: string }[] = [
  { id: 'status', icon: FolderGit2, label: 'Changes' },
  { id: 'history', icon: Clock, label: 'History' },
  { id: 'branches', icon: GitBranch, label: 'Branches' },
  { id: 'stash', icon: Archive, label: 'Stash' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { currentView, setCurrentView } = useUIStore();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex w-14 flex-col border-r bg-muted/40">
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === item.id ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setCurrentView(item.id)}
                  className={cn('h-10 w-10')}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
