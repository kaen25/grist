import { useState, useMemo } from 'react';
import { FileCode, Eye, EyeOff } from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { FileTree } from './FileTree';
import { DiffViewer } from '../diff';
import { useRepositoryStore, useUIStore } from '@/application/stores';
import { useGitStatus, useStagingActions } from '@/application/hooks';

export function StatusView() {
  const { status } = useRepositoryStore();
  const { selectedFiles, hideEolOnlyFiles, toggleHideEolOnlyFiles } = useUIStore();
  const { discardChanges } = useStagingActions();

  const [discardDialog, setDiscardDialog] = useState<{
    open: boolean;
    path: string;
    isUntracked: boolean;
  }>({ open: false, path: '', isUntracked: false });

  // Start status polling
  useGitStatus();

  // Filter out EOL-only files if the option is enabled
  const filteredStaged = useMemo(() => {
    if (!status) return [];
    if (!hideEolOnlyFiles) return status.staged;
    return status.staged.filter((f) => !f.only_eol_changes);
  }, [status, hideEolOnlyFiles]);

  const filteredUnstaged = useMemo(() => {
    if (!status) return [];
    if (!hideEolOnlyFiles) return status.unstaged;
    return status.unstaged.filter((f) => !f.only_eol_changes);
  }, [status, hideEolOnlyFiles]);

  // Count hidden EOL-only files
  const hiddenEolCount = useMemo(() => {
    if (!status || !hideEolOnlyFiles) return 0;
    const stagedEol = status.staged.filter((f) => f.only_eol_changes).length;
    const unstagedEol = status.unstaged.filter((f) => f.only_eol_changes).length;
    return stagedEol + unstagedEol;
  }, [status, hideEolOnlyFiles]);

  // Determine if the selected file is staged or untracked
  const selectedFile = selectedFiles[0] ?? null;
  const isSelectedFileStaged = useMemo(() => {
    if (!selectedFile || !status) return false;
    return status.staged.some((f) => f.path === selectedFile);
  }, [selectedFile, status]);
  const isSelectedFileUntracked = useMemo(() => {
    if (!selectedFile || !status) return false;
    return status.untracked.some((f) => f.path === selectedFile);
  }, [selectedFile, status]);

  const isSelectedFileEolOnly = useMemo(() => {
    if (!selectedFile || !status) return false;
    const staged = status.staged.find((f) => f.path === selectedFile);
    if (staged?.only_eol_changes) return true;
    const unstaged = status.unstaged.find((f) => f.path === selectedFile);
    return unstaged?.only_eol_changes ?? false;
  }, [selectedFile, status]);

  const handleDiscardRequest = (path: string, isUntracked: boolean) => {
    setDiscardDialog({ open: true, path, isUntracked });
  };

  const handleDiscardConfirm = async () => {
    await discardChanges(discardDialog.path, discardDialog.isUntracked);
    setDiscardDialog({ open: false, path: '', isUntracked: false });
  };

  return (
    <>
      <ResizablePanelGroup className="h-full">
        {/* Left panel: File lists */}
        <ResizablePanel defaultSize={30} minSize={20}>
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {/* EOL filter toggle */}
              <div className="flex items-center justify-between px-2 py-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={hideEolOnlyFiles ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 gap-1.5"
                      onClick={toggleHideEolOnlyFiles}
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      {hideEolOnlyFiles ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {hiddenEolCount > 0 && (
                        <span className="text-xs text-muted-foreground">({hiddenEolCount})</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hideEolOnlyFiles
                      ? `Show ${hiddenEolCount} file(s) with only line ending changes`
                      : 'Hide files with only line ending changes'}
                  </TooltipContent>
                </Tooltip>
              </div>

              <FileTree
                title="Staged Changes"
                files={filteredStaged}
                type="staged"
              />
              <FileTree
                title="Changes"
                files={filteredUnstaged}
                type="unstaged"
                onDiscardRequest={handleDiscardRequest}
              />
              <FileTree
                title="Untracked"
                files={status?.untracked ?? []}
                type="untracked"
                onDiscardRequest={handleDiscardRequest}
              />
              {status?.conflicted && status.conflicted.length > 0 && (
                <FileTree
                  title="Conflicts"
                  files={status.conflicted}
                  type="conflicted"
                />
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: Diff viewer */}
        <ResizablePanel defaultSize={70}>
          {selectedFile ? (
            <DiffViewer
              path={selectedFile}
              staged={isSelectedFileStaged}
              untracked={isSelectedFileUntracked}
              onlyEolChanges={isSelectedFileEolOnly}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a file to view changes
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      <AlertDialog
        open={discardDialog.open}
        onOpenChange={(open) => setDiscardDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {discardDialog.isUntracked
                ? `This will permanently delete "${discardDialog.path}". This action cannot be undone.`
                : `This will discard all changes to "${discardDialog.path}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
