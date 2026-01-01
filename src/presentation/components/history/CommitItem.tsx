import { useState } from 'react';
import { GitBranch, Trash2, Copy, Check, Pencil, Tag } from 'lucide-react';
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

interface RefInfo {
  label: string;
  isHead: boolean;
  isTag: boolean;
  isRemote: boolean;
  remoteName: string | null;
  branchName: string;
}

function formatRef(ref: string): RefInfo {
  const isHead = ref.startsWith('HEAD -> ');
  const isTag = ref.startsWith('tag: ') || ref.includes('refs/tags/');
  const isRemote = ref.includes('origin/') || ref.includes('refs/remotes/');
  let label = ref
    .replace('HEAD -> ', '')
    .replace('tag: ', '')
    .replace('refs/heads/', '')
    .replace('refs/tags/', '')
    .replace('refs/remotes/', '');

  // Parse remote name and branch name for remote branches
  let remoteName: string | null = null;
  let branchName = label;
  if (isRemote && label.includes('/')) {
    const parts = label.split('/');
    remoteName = parts[0];
    branchName = parts.slice(1).join('/');
  }

  return { label, isHead, isTag, isRemote, remoteName, branchName };
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
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get local branches on this commit
  const localBranches = commit.refs
    .filter((ref) => {
      const { isTag, isRemote } = formatRef(ref);
      return !isTag && !isRemote;
    })
    .map((ref) => formatRef(ref));

  // Get remote branches on this commit
  const remoteBranches = commit.refs
    .filter((ref) => {
      const { isTag, isRemote } = formatRef(ref);
      return !isTag && isRemote;
    })
    .map((ref) => formatRef(ref));

  // Get tags on this commit
  const tags = commit.refs
    .filter((ref) => {
      const { isTag } = formatRef(ref);
      return isTag;
    })
    .map((ref) => formatRef(ref));

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

  const handleDeleteRemoteBranch = async (remote: string, branch: string) => {
    if (!currentRepo) return;

    try {
      await tauriGitService.deleteRemoteBranch(currentRepo.path, remote, branch);
      toast.success(`Deleted remote branch "${remote}/${branch}"`);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to delete remote branch: ${error}`);
    }
  };

  const handleOpenRename = (name: string) => {
    setRenameFrom(name);
    setRenameTo(name);
    setShowRenameDialog(true);
  };

  const handleRenameBranch = async () => {
    if (!currentRepo || !renameTo.trim() || renameTo === renameFrom) return;

    setIsRenaming(true);
    try {
      await tauriGitService.renameBranch(currentRepo.path, renameFrom, renameTo.trim());
      toast.success(`Renamed branch "${renameFrom}" to "${renameTo}"`);
      setShowRenameDialog(false);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to rename branch: ${error}`);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleCopyHash = async () => {
    await navigator.clipboard.writeText(commit.hash);
    setCopied(true);
    toast.success('Hash copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTag = async () => {
    if (!currentRepo || !tagName.trim()) return;

    setIsCreatingTag(true);
    try {
      await tauriGitService.createTag(
        currentRepo.path,
        tagName.trim(),
        commit.hash,
        tagMessage.trim() || undefined
      );
      toast.success(`Created tag "${tagName}" at ${commit.short_hash}`);
      setTagName('');
      setTagMessage('');
      setShowCreateTagDialog(false);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to create tag: ${error}`);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleDeleteTag = async (name: string) => {
    if (!currentRepo) return;

    try {
      await tauriGitService.deleteTag(currentRepo.path, name);
      toast.success(`Deleted tag "${name}"`);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to delete tag: ${error}`);
    }
  };

  const handleDeleteRemoteTag = async (name: string) => {
    if (!currentRepo) return;

    try {
      // Delete from origin by default
      await tauriGitService.deleteRemoteTag(currentRepo.path, 'origin', name);
      toast.success(`Deleted remote tag "${name}"`);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to delete remote tag: ${error}`);
    }
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
          <ContextMenuItem onClick={() => setShowCreateTagDialog(true)}>
            <Tag className="h-4 w-4 mr-2" />
            Create tag here...
          </ContextMenuItem>

          {/* Local branches: rename and delete */}
          {localBranches.length > 0 && (
            <>
              <ContextMenuSeparator />
              {localBranches.map((branch) => (
                <ContextMenuItem
                  key={`rename-${branch.branchName}`}
                  onClick={() => handleOpenRename(branch.branchName)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename "{branch.branchName}"...
                </ContextMenuItem>
              ))}
              {localBranches.map((branch) => (
                <ContextMenuItem
                  key={`delete-${branch.branchName}`}
                  onClick={() => handleDeleteBranch(branch.branchName)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete "{branch.branchName}"
                </ContextMenuItem>
              ))}
            </>
          )}

          {/* Remote branches: delete */}
          {remoteBranches.length > 0 && (
            <>
              <ContextMenuSeparator />
              {remoteBranches.map((branch) => (
                <ContextMenuItem
                  key={`delete-remote-${branch.label}`}
                  onClick={() => handleDeleteRemoteBranch(branch.remoteName!, branch.branchName)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete remote "{branch.label}"
                </ContextMenuItem>
              ))}
            </>
          )}

          {/* Tags: delete local and remote */}
          {tags.length > 0 && (
            <>
              <ContextMenuSeparator />
              {tags.map((tag) => (
                <ContextMenuItem
                  key={`delete-tag-${tag.label}`}
                  onClick={() => handleDeleteTag(tag.label)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete tag "{tag.label}"
                </ContextMenuItem>
              ))}
              {tags.map((tag) => (
                <ContextMenuItem
                  key={`delete-remote-tag-${tag.label}`}
                  onClick={() => handleDeleteRemoteTag(tag.label)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete remote tag "{tag.label}"
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

      {/* Rename Branch Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Branch "{renameFrom}"</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="rename-branch">New Name</Label>
            <Input
              id="rename-branch"
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              placeholder="new-branch-name"
              disabled={isRenaming}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameTo.trim() && renameTo !== renameFrom) {
                  handleRenameBranch();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameBranch}
              disabled={!renameTo.trim() || renameTo === renameFrom || isRenaming}
            >
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={showCreateTagDialog} onOpenChange={setShowCreateTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag at {commit.short_hash}</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="v1.0.0"
                disabled={isCreatingTag}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="tag-message">Message (optional, for annotated tag)</Label>
              <Input
                id="tag-message"
                value={tagMessage}
                onChange={(e) => setTagMessage(e.target.value)}
                placeholder="Release version 1.0.0"
                disabled={isCreatingTag}
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagName.trim()) {
                    handleCreateTag();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTag} disabled={!tagName.trim() || isCreatingTag}>
              {isCreatingTag ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
