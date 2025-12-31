import { File, FileText, FilePlus, FileMinus, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/application/stores';
import { StatusClassifier } from '@/domain/services/status-classifier.service';
import { cn } from '@/lib/utils';
import type { StatusEntry } from '@/domain/entities';
import type { FileStatus } from '@/domain/value-objects';

interface FileItemProps {
  entry: StatusEntry;
  type: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
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

export function FileItem({ entry, type }: FileItemProps) {
  const { selectedFiles, toggleFileSelection } = useUIStore();
  const isSelected = selectedFiles.includes(entry.path);

  const status = type === 'staged' ? entry.index_status : entry.worktree_status;
  const Icon = getStatusIcon(status);
  const color = StatusClassifier.getColor(status);
  const label = StatusClassifier.getLabel(status);

  const fileName = entry.path.split('/').pop() ?? entry.path;
  const dirPath = entry.path.includes('/')
    ? entry.path.substring(0, entry.path.lastIndexOf('/'))
    : '';

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'w-full justify-start gap-2 px-2 h-7',
        isSelected && 'bg-accent'
      )}
      onClick={() => toggleFileSelection(entry.path)}
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
  );
}
