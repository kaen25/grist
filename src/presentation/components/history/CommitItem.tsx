import { useState } from 'react';
import { GitBranch, Trash2, Copy, Check } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';
import type { Commit } from '@/domain/entities';

interface CommitItemProps {
  commit: Commit;
  isSelected: boolean;
  onSelect: () => void;
  onBranchChange?: () => void;
}

function formatRef(ref: string): {
  label: string;
  isHead: boolean;
  isTag: boolean;
  isRemote: boolean;
} {
  const isHead = ref.startsWith('HEAD -> ');
  const isTag = ref.startsWith('tag: ') || ref.includes('refs/tags/');
  const isRemote = ref.includes('origin/') || ref.includes('refs/remotes/');
  let label = ref
    .replace('HEAD -> ', '')
    .replace('tag: ', '')
    .replace('refs/heads/', '')
    .replace('refs/tags/', '')
    .replace('refs/remotes/', '');
  return { label, isHead, isTag, isRemote };
}

// Simple avatar with initials
function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
      {initials}
    </div>
  );
}

export function CommitItem({ commit, isSelected, onSelect, onBranchChange }: CommitItemProps) {
  const { currentRepo } = useRepositoryStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get local branches on this commit (for delete option)
  const localBranches = commit.refs
    .filter((ref) => {
      const { isTag, isRemote } = formatRef(ref);
      return !isTag && !isRemote;
    })
    .map((ref) => formatRef(ref).label);

  const handleCreateBranch = async () => {
    if (!currentRepo || !branchName.trim()) return;

    setIsCreating(true);
    try {
      await tauriGitService.createBranch(currentRepo.path, branchName.trim(), commit.hash);
      toast.success(`Created branch "${branchName}" at ${commit.short_hash}`);
      setBranchName('');
      setShowCreateDialog(false);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to create branch: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBranch = async (name: string) => {
    if (!currentRepo) return;

    try {
      await tauriGitService.deleteBranch(currentRepo.path, name, false);
      toast.success(`Deleted branch "${name}"`);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to delete branch: ${error}`);
    }
  };

  const handleCopyHash = async () => {
    await navigator.clipboard.writeText(commit.hash);
    setCopied(true);
    toast.success('Hash copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onSelect}
            className={cn(
              'w-full h-full text-left pl-2 pr-4 flex items-center gap-2 border-b hover:bg-accent/50 transition-colors',
              isSelected && 'bg-accent'
            )}
          >
            {/* Branch/Tag badges - outline style */}
            {commit.refs.length > 0 && (
              <div className="flex gap-1 flex-shrink-0">
                {commit.refs.slice(0, 3).map((ref) => {
                  const { label, isHead, isTag, isRemote } = formatRef(ref);
                  return (
                    <span
                      key={ref}
                      className={cn(
                        'px-1.5 rounded text-xs font-medium border truncate max-w-[100px] leading-tight',
                        isTag && 'border-amber-500 text-amber-500',
                        !isTag && isRemote && 'border-red-500 text-red-500',
                        !isTag && !isRemote && 'border-green-500 text-green-500',
                        isHead && 'font-bold'
                      )}
                      title={label}
                    >
                      {label}
                    </span>
                  );
                })}
                {commit.refs.length > 3 && (
                  <span className="px-1.5 rounded text-xs border border-muted-foreground text-muted-foreground leading-tight">
                    +{commit.refs.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Commit message */}
            <div className="flex-1 min-w-0 truncate text-sm">
              {commit.subject}
            </div>

            {/* Author avatar */}
            <AuthorAvatar name={commit.author_name} />

            {/* Short hash */}
            <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
              {commit.short_hash}
            </span>
          </button>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={() => setShowCreateDialog(true)}>
            <GitBranch className="h-4 w-4 mr-2" />
            Create branch here...
          </ContextMenuItem>

          {localBranches.length > 0 && (
            <>
              <ContextMenuSeparator />
              {localBranches.map((name) => (
                <ContextMenuItem
                  key={name}
                  onClick={() => handleDeleteBranch(name)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete "{name}"
                </ContextMenuItem>
              ))}
            </>
          )}

          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleCopyHash}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Copy commit hash
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Create Branch Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Branch at {commit.short_hash}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="feature/my-feature"
              disabled={isCreating}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && branchName.trim()) {
                  handleCreateBranch();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBranch} disabled={!branchName.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
