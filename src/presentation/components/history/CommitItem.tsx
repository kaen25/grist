import { useState } from 'react';
import {
  GitBranch,
  Trash2,
  Copy,
  Check,
  Pencil,
  Tag,
  GitCommitHorizontal,
  RotateCcw,
  FileText,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { GravatarAvatar } from '@/presentation/components/common';
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

export function CommitItem({ commit, isSelected, onSelect, onBranchChange }: CommitItemProps) {
  const { currentRepo } = useRepositoryStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
  const [showForceDeleteDialog, setShowForceDeleteDialog] = useState(false);
  const [branchToForceDelete, setBranchToForceDelete] = useState('');
  const [branchName, setBranchName] = useState('');
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isForceDeleting, setIsForceDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get local branches ON THIS COMMIT (for rename - contextual)
  const localBranchesOnCommit = commit.refs
    .filter((ref) => {
      const { isTag, isRemote } = formatRef(ref);
      return !isTag && !isRemote;
    })
    .map((ref) => formatRef(ref));

  // Get remote branches ON THIS COMMIT (for delete)
  // Filter out HEAD refs like "origin/HEAD"
  const remoteBranchesOnCommit = commit.refs
    .filter((ref) => {
      const { isTag, isRemote, branchName } = formatRef(ref);
      return !isTag && isRemote && branchName !== 'HEAD';
    })
    .map((ref) => formatRef(ref));

  // Get tags on this commit
  const tagsOnCommit = commit.refs
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
      const errorMsg = String(error);
      // Check if it's a "not fully merged" error - offer force delete
      // Git suggests "git branch -D" in the hint - this command is never translated
      if (errorMsg.includes('git branch -D')) {
        // Check if other refs exist on this commit - if so, safe to force delete
        const otherRefs = commit.refs.filter((ref) => {
          const { branchName, isRemote } = formatRef(ref);
          // Exclude the branch we're deleting and HEAD markers
          if (branchName === 'HEAD') return false;
          if (!isRemote && branchName === name) return false;
          return true;
        });

        if (otherRefs.length > 0) {
          // Other refs exist, safe to force delete without confirmation
          try {
            await tauriGitService.deleteBranch(currentRepo.path, name, true);
            toast.success(`Deleted branch "${name}"`);
            onBranchChange?.();
          } catch (forceError) {
            toast.error(`Failed to delete branch: ${forceError}`);
          }
        } else {
          // No other refs, show confirmation dialog
          setBranchToForceDelete(name);
          setShowForceDeleteDialog(true);
        }
      } else {
        toast.error(`Failed to delete branch: ${error}`);
      }
    }
  };

  const handleForceDeleteBranch = async () => {
    if (!currentRepo || !branchToForceDelete) return;

    setIsForceDeleting(true);
    try {
      await tauriGitService.deleteBranch(currentRepo.path, branchToForceDelete, true);
      toast.success(`Deleted branch "${branchToForceDelete}"`);
      setShowForceDeleteDialog(false);
      setBranchToForceDelete('');
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to delete branch: ${error}`);
    } finally {
      setIsForceDeleting(false);
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

  const handleCopySubject = async () => {
    await navigator.clipboard.writeText(commit.subject);
    toast.success('Subject copied to clipboard');
  };

  const handleCheckoutCommit = async () => {
    if (!currentRepo) return;

    try {
      await tauriGitService.checkoutBranch(currentRepo.path, commit.hash);
      toast.success(`Checked out ${commit.short_hash}`);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to checkout: ${error}`);
    }
  };

  const handleCheckoutBranch = async (name: string) => {
    if (!currentRepo) return;

    try {
      await tauriGitService.checkoutBranch(currentRepo.path, name);
      toast.success(`Switched to branch "${name}"`);
      onBranchChange?.();
    } catch (error) {
      toast.error(`Failed to checkout branch: ${error}`);
    }
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
              <div className="flex gap-1 shrink-0">
                {commit.refs.slice(0, 3).map((ref) => {
                  const { label, isHead, isTag, isRemote } = formatRef(ref);
                  return (
                    <span
                      key={ref}
                      className={cn(
                        'px-1.5 rounded text-xs font-medium truncate max-w-[100px] leading-tight',
                        // Current branch (HEAD): filled green, white text
                        isHead && 'bg-green-500 text-white font-bold',
                        // Tags: outline amber
                        !isHead && isTag && 'border border-amber-500 text-amber-500',
                        // Remote branches: outline red
                        !isHead && !isTag && isRemote && 'border border-red-500 text-red-500',
                        // Local branches (not HEAD): outline green
                        !isHead && !isTag && !isRemote && 'border border-green-500 text-green-500'
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
            <GravatarAvatar
              email={commit.author_email}
              name={commit.author_name}
              size={20}
              fallback="identicon"
            />

            {/* Short hash */}
            <span className="font-mono text-xs text-muted-foreground shrink-0">
              {commit.short_hash}
            </span>
          </button>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-64">
          {/* Copy to clipboard - like GitExtensions, at the top */}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Copy className="h-4 w-4 mr-2" />
              Copy to clipboard
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <ContextMenuItem onClick={handleCopyHash}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Commit hash
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopySubject}>
                <FileText className="h-4 w-4 mr-2" />
                Commit subject
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />

          {/* Checkout branch - branches ON THIS COMMIT (excluding current HEAD) */}
          {(() => {
            const allBranches = [...localBranchesOnCommit, ...remoteBranchesOnCommit];
            const checkoutableBranches = allBranches.filter((b) => !b.isHead);

            if (checkoutableBranches.length === 0) return null;

            // Single branch - direct action
            if (checkoutableBranches.length === 1) {
              const branch = checkoutableBranches[0];
              const displayName = branch.isRemote ? branch.label : branch.branchName;
              return (
                <ContextMenuItem onClick={() => handleCheckoutBranch(displayName)}>
                  <Check className="h-4 w-4 mr-2" />
                  Checkout branch...
                </ContextMenuItem>
              );
            }

            // Multiple branches - submenu
            return (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Check className="h-4 w-4 mr-2" />
                  Checkout branch...
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 max-h-80 overflow-y-auto">
                  {/* Local branches first */}
                  {localBranchesOnCommit
                    .filter((b) => !b.isHead)
                    .map((branch) => (
                      <ContextMenuItem
                        key={`checkout-${branch.branchName}`}
                        onClick={() => handleCheckoutBranch(branch.branchName)}
                        title={branch.branchName}
                      >
                        <span className="truncate">{branch.branchName}</span>
                      </ContextMenuItem>
                    ))}
                  {/* Separator if both types exist */}
                  {localBranchesOnCommit.filter((b) => !b.isHead).length > 0 &&
                    remoteBranchesOnCommit.length > 0 && <ContextMenuSeparator />}
                  {/* Remote branches */}
                  {remoteBranchesOnCommit.map((branch) => (
                    <ContextMenuItem
                      key={`checkout-remote-${branch.label}`}
                      onClick={() => handleCheckoutBranch(branch.label)}
                      title={branch.label}
                    >
                      <span className="truncate">{branch.label}</span>
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            );
          })()}

          {/* Branch operations on this commit */}
          <ContextMenuItem onClick={() => setShowCreateDialog(true)}>
            <GitBranch className="h-4 w-4 mr-2" />
            Create new branch here...
          </ContextMenuItem>

          {/* Rename branch - only branches ON THIS COMMIT (contextual) */}
          {localBranchesOnCommit.length === 1 && (
            <ContextMenuItem onClick={() => handleOpenRename(localBranchesOnCommit[0].branchName)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename branch...
            </ContextMenuItem>
          )}
          {localBranchesOnCommit.length > 1 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Pencil className="h-4 w-4 mr-2" />
                Rename branch...
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {localBranchesOnCommit.map((branch) => (
                  <ContextMenuItem
                    key={`rename-${branch.branchName}`}
                    onClick={() => handleOpenRename(branch.branchName)}
                    title={branch.branchName}
                  >
                    <span className="truncate">{branch.branchName}</span>
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          {/* Delete branch - branches ON THIS COMMIT (local + remote) like GitExtensions */}
          {(() => {
            const allBranches = [...localBranchesOnCommit, ...remoteBranchesOnCommit];
            const deletableBranches = allBranches.filter((b) => !b.isHead);

            if (deletableBranches.length === 0) return null;

            // Single deletable branch AND no other branches to show - direct action
            if (deletableBranches.length === 1 && allBranches.length === 1) {
              const branch = deletableBranches[0];
              if (branch.isRemote) {
                return (
                  <ContextMenuItem
                    onClick={() => handleDeleteRemoteBranch(branch.remoteName!, branch.branchName)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete branch...
                  </ContextMenuItem>
                );
              } else {
                return (
                  <ContextMenuItem
                    onClick={() => handleDeleteBranch(branch.branchName)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete branch...
                  </ContextMenuItem>
                );
              }
            }

            // Multiple branches - submenu (show all, disable HEAD)
            return (
              <ContextMenuSub>
                <ContextMenuSubTrigger className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete branch...
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 max-h-80 overflow-y-auto">
                  {/* Local branches first */}
                  {localBranchesOnCommit.map((branch) => (
                    <ContextMenuItem
                      key={`delete-${branch.branchName}`}
                      onClick={() => handleDeleteBranch(branch.branchName)}
                      className={branch.isHead ? '' : 'text-destructive focus:text-destructive'}
                      disabled={branch.isHead}
                      title={branch.branchName}
                    >
                      <span className="truncate">
                        {branch.branchName}
                        {branch.isHead && ' (current)'}
                      </span>
                    </ContextMenuItem>
                  ))}
                  {/* Separator if both types exist */}
                  {localBranchesOnCommit.length > 0 && remoteBranchesOnCommit.length > 0 && (
                    <ContextMenuSeparator />
                  )}
                  {/* Remote branches */}
                  {remoteBranchesOnCommit.map((branch) => (
                    <ContextMenuItem
                      key={`delete-remote-${branch.label}`}
                      onClick={() => handleDeleteRemoteBranch(branch.remoteName!, branch.branchName)}
                      className="text-destructive focus:text-destructive"
                      title={branch.label}
                    >
                      <span className="truncate">{branch.label}</span>
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            );
          })()}

          <ContextMenuSeparator />

          {/* Tag operations */}
          <ContextMenuItem onClick={() => setShowCreateTagDialog(true)}>
            <Tag className="h-4 w-4 mr-2" />
            Create new tag here...
          </ContextMenuItem>

          {/* Delete tag - tags ON THIS COMMIT (like Delete branch) */}
          {(() => {
            if (tagsOnCommit.length === 0) return null;

            // Single tag - direct action
            if (tagsOnCommit.length === 1) {
              return (
                <ContextMenuItem
                  onClick={() => handleDeleteTag(tagsOnCommit[0].label)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete tag...
                </ContextMenuItem>
              );
            }

            // Multiple tags - submenu
            return (
              <ContextMenuSub>
                <ContextMenuSubTrigger className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete tag...
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 max-h-80 overflow-y-auto">
                  {tagsOnCommit.map((tag) => (
                    <ContextMenuItem
                      key={`delete-tag-${tag.label}`}
                      onClick={() => handleDeleteTag(tag.label)}
                      className="text-destructive focus:text-destructive"
                      title={tag.label}
                    >
                      <span className="truncate">{tag.label}</span>
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            );
          })()}

          <ContextMenuSeparator />

          {/* Commit operations */}
          <ContextMenuItem onClick={handleCheckoutCommit}>
            <GitCommitHorizontal className="h-4 w-4 mr-2" />
            Checkout this commit...
          </ContextMenuItem>

          {/* Future operations - disabled for now */}
          <ContextMenuItem disabled>
            <RotateCcw className="h-4 w-4 mr-2" />
            Revert this commit...
          </ContextMenuItem>
          <ContextMenuItem disabled>
            <GitBranch className="h-4 w-4 mr-2" />
            Cherry pick this commit...
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

      {/* Force Delete Branch Confirmation Dialog */}
      <Dialog open={showForceDeleteDialog} onOpenChange={setShowForceDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Branch Not Fully Merged</DialogTitle>
            <DialogDescription>
              The branch "{branchToForceDelete}" is not fully merged. Deleting it may result in losing commits that are not reachable from any other branch.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to force delete this branch?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForceDeleteDialog(false);
                setBranchToForceDelete('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceDeleteBranch}
              disabled={isForceDeleting}
            >
              {isForceDeleting ? 'Deleting...' : 'Force Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
