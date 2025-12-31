import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTree } from './FileTree';
import { useRepositoryStore, useUIStore } from '@/application/stores';
import { useGitStatus } from '@/application/hooks';

export function StatusView() {
  const { status } = useRepositoryStore();
  const { selectedFiles } = useUIStore();

  // Start status polling
  useGitStatus();

  return (
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
            />
            <FileTree
              title="Untracked"
              files={status?.untracked ?? []}
              type="untracked"
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
  );
}
