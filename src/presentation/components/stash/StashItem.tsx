import { useState } from 'react';
import { Archive, Play, Trash2, Copy, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Stash } from '@/domain/entities';

interface StashItemProps {
  stash: Stash;
  isSelected: boolean;
  onSelect: () => void;
  onAction: () => void;
}

export function StashItem({ stash, isSelected, onSelect, onAction }: StashItemProps) {
  const { currentRepo } = useRepositoryStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showDropConfirm, setShowDropConfirm] = useState(false);

  const handleApply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentRepo) return;
    setIsLoading(true);
    try {
      await tauriGitService.applyStash(currentRepo.path, stash.index);
      toast.success('Stash applied');
      onAction();
    } catch (error) {
      toast.error(`Failed to apply stash: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentRepo) return;
    setIsLoading(true);
    try {
      await tauriGitService.popStash(currentRepo.path, stash.index);
      toast.success('Stash popped');
      onAction();
    } catch (error) {
      toast.error(`Failed to pop stash: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async () => {
    if (!currentRepo) return;
    setIsLoading(true);
    try {
      await tauriGitService.dropStash(currentRepo.path, stash.index);
      toast.success('Stash dropped');
      onAction();
    } catch (error) {
      toast.error(`Failed to drop stash: ${error}`);
    } finally {
      setIsLoading(false);
      setShowDropConfirm(false);
    }
  };

  // Format the date if available
  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div
        onClick={onSelect}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border group cursor-pointer transition-colors',
          isSelected
            ? 'bg-accent border-accent-foreground/20'
            : 'hover:bg-accent/50'
        )}
      >
        <Archive className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">
              stash@{`{${stash.index}}`}
            </span>
            {stash.branch && (
              <Badge variant="outline" className="text-xs">
                {stash.branch}
              </Badge>
            )}
            {stash.date && (
              <span className="text-xs text-muted-foreground">
                {formatDate(stash.date)}
              </span>
            )}
          </div>
          <div className="font-medium mt-1 truncate" title={stash.message}>
            {stash.message || 'WIP'}
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handlePop}
                title="Pop (apply and remove)"
              >
                <Play className="h-4 w-4 mr-1" />
                Pop
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleApply}>
                    <Copy className="h-4 w-4 mr-2" />
                    Apply (keep stash)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePop}>
                    <Play className="h-4 w-4 mr-2" />
                    Pop (apply and remove)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropConfirm(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Drop
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showDropConfirm} onOpenChange={setShowDropConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drop stash?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete stash@{`{${stash.index}}`}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDrop}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Drop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
