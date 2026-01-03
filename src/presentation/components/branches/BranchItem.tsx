import { GitBranch, Check, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';
import type { Branch } from '@/domain/entities';

interface BranchItemProps {
  branch: Branch;
  onAction: () => void;
}

export function BranchItem({ branch, onAction }: BranchItemProps) {
  const { currentRepo } = useRepositoryStore();

  const handleCheckout = async () => {
    if (!currentRepo) return;
    try {
      await tauriGitService.checkoutBranch(currentRepo.path, branch.name);
      toast.success(`Switched to branch ${branch.name}`);
      onAction();
    } catch (error) {
      toast.error(`Failed to checkout: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!currentRepo) return;
    try {
      await tauriGitService.deleteBranch(currentRepo.path, branch.name);
      toast.success(`Deleted branch ${branch.name}`);
      onAction();
    } catch (error) {
      toast.error(`Failed to delete: ${error}`);
    }
  };

  const displayName = branch.remote_name
    ? `${branch.remote_name}/${branch.name}`
    : branch.name;

  return (
    <div className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 group">
      <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />

      <span className="flex-1 font-medium truncate">{displayName}</span>

      {branch.is_current && (
        <Badge variant="secondary" className="text-xs shrink-0">
          <Check className="h-3 w-3 mr-1" />
          current
        </Badge>
      )}

      {(branch.ahead > 0 || branch.behind > 0) && (
        <span className="text-xs text-muted-foreground shrink-0">
          {branch.ahead > 0 && <span className="text-green-500">↑{branch.ahead}</span>}
          {branch.ahead > 0 && branch.behind > 0 && ' '}
          {branch.behind > 0 && <span className="text-red-500">↓{branch.behind}</span>}
        </span>
      )}

      {!branch.is_remote && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!branch.is_current && (
              <DropdownMenuItem onClick={handleCheckout}>
                <Check className="h-4 w-4 mr-2" />
                Checkout
              </DropdownMenuItem>
            )}
            {!branch.is_current && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
            {branch.is_current && (
              <DropdownMenuItem disabled>
                <Pencil className="h-4 w-4 mr-2" />
                Current branch
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
