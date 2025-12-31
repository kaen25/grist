import { File, FileText, FilePlus, FileMinus, FileQuestion, Plus, Minus, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useUIStore } from '@/application/stores';
import { useStagingActions } from '@/application/hooks';
import { StatusClassifier } from '@/domain/services/status-classifier.service';
import { cn } from '@/lib/utils';
import type { StatusEntry } from '@/domain/entities';
import type { FileStatus } from '@/domain/value-objects';

interface FileItemProps {
  entry: StatusEntry;
  type: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
  allFilePaths: string[];
  onDiscardRequest?: (path: string, isUntracked: boolean) => void;
}

const iconMap: Record<string, typeof File> = {
  FilePlus,
  FileMinus,
  FileText,
  FileQuestion,
  File,
};

function getStatusIcon(status: FileStatus) {
  const iconName = StatusClassifier.getIcon(status);
  return iconMap[iconName] ?? File;
}

export function FileItem({ entry, type, allFilePaths, onDiscardRequest }: FileItemProps) {
  const { selectedFiles, setSelectedFiles, toggleFileSelection, selectFileRange } = useUIStore();
  const { stageFile, unstageFile } = useStagingActions();
  const isSelected = selectedFiles.includes(entry.path);

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift+click: range selection
      selectFileRange(entry.path, allFilePaths);
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl+click: toggle selection
      toggleFileSelection(entry.path);
    } else {
      // Normal click: select this file only (opens diff)
      setSelectedFiles([entry.path]);
    }
  };

  const status = type === 'staged' ? entry.index_status : entry.worktree_status;
  const Icon = getStatusIcon(status);
  const color = StatusClassifier.getColor(status);
  const label = StatusClassifier.getLabel(status);

  const fileName = entry.path.split('/').pop() ?? entry.path;
  const dirPath = entry.path.includes('/')
    ? entry.path.substring(0, entry.path.lastIndexOf('/'))
    : '';

  const handleStage = async () => {
    await stageFile(entry.path);
  };

  const handleUnstage = async () => {
    await unstageFile(entry.path);
  };

  const handleDiscard = () => {
    onDiscardRequest?.(entry.path, type === 'untracked');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-2 px-2 h-7',
            isSelected && 'bg-accent'
          )}
          onClick={handleClick}
        >
          <span className={cn('w-4 text-center text-xs font-mono', color)}>
            {label}
          </span>
          <Icon className={cn('h-4 w-4 flex-shrink-0', color)} />
          <span className="truncate flex-1 text-left">
            {fileName}
            {dirPath && (
              <span className="text-muted-foreground ml-1 text-xs">
                {dirPath}
              </span>
            )}
          </span>
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {type === 'staged' ? (
          <ContextMenuItem onClick={handleUnstage}>
            <Minus className="mr-2 h-4 w-4" />
            Unstage
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={handleStage}>
            <Plus className="mr-2 h-4 w-4" />
            Stage
          </ContextMenuItem>
        )}
        {type !== 'staged' && (
          <ContextMenuItem onClick={handleDiscard} className="text-destructive">
            <Undo className="mr-2 h-4 w-4" />
            Discard changes
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
