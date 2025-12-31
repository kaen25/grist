import { useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useRepositoryStore, useUIStore } from '@/application/stores';
import { useGitStatus, useStagingActions } from '@/application/hooks';

export function StatusView() {
  const { status } = useRepositoryStore();
  const { selectedFiles } = useUIStore();
  const { discardChanges } = useStagingActions();

  const [discardDialog, setDiscardDialog] = useState<{
    open: boolean;
    path: string;
    isUntracked: boolean;
  }>({ open: false, path: '', isUntracked: false });

  // Start status polling
  useGitStatus();

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
              <FileTree
                title="Staged Changes"
                files={status?.staged ?? []}
                type="staged"
              />
              <FileTree
                title="Changes"
                files={status?.unstaged ?? []}
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

        {/* Right panel: Diff viewer placeholder */}
        <ResizablePanel defaultSize={70}>
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {selectedFiles.length > 0
              ? `Selected: ${selectedFiles[0]}`
              : 'Select a file to view changes'}
          </div>
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
