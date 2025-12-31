import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileItem } from './FileItem';
import { useStagingActions } from '@/application/hooks';
import { useUIStore } from '@/application/stores';
import type { StatusEntry } from '@/domain/entities';

interface FileTreeProps {
  title: string;
  files: StatusEntry[];
  type: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
  onDiscardRequest?: (path: string, isUntracked: boolean) => void;
}

export function FileTree({ title, files, type, onDiscardRequest }: FileTreeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { stageAll, unstageAll, stageFile, unstageFile } = useStagingActions();
  const { selectedFiles } = useUIStore();

  const allFilePaths = useMemo(() => files.map((f) => f.path), [files]);

  // Get selected files that belong to this tree
  const selectedInTree = useMemo(
    () => selectedFiles.filter((f) => allFilePaths.includes(f)),
    [selectedFiles, allFilePaths]
  );

  if (files.length === 0) return null;

  const handleStageAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await stageAll();
  };

  const handleUnstageAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await unstageAll();
  };

  const handleStageSelected = async (e: React.MouseEvent) => {
    e.stopPropagation();
    for (const path of selectedInTree) {
      await stageFile(path);
    }
  };

  const handleUnstageSelected = async (e: React.MouseEvent) => {
    e.stopPropagation();
    for (const path of selectedInTree) {
      await unstageFile(path);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 px-2"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="flex-1 text-left">{title}</span>
            <Badge variant="secondary">
              {files.length}
            </Badge>
          </Button>
        </CollapsibleTrigger>
        {type === 'staged' && selectedInTree.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleUnstageSelected}
            title={`Unstage ${selectedInTree.length} selected`}
          >
            <Minus className="h-3 w-3 mr-1" />
            {selectedInTree.length}
          </Button>
        )}
        {type === 'staged' && selectedInTree.length <= 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleUnstageAll}
            title="Unstage all"
          >
            <Minus className="h-3 w-3" />
          </Button>
        )}
        {(type === 'unstaged' || type === 'untracked') && selectedInTree.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleStageSelected}
            title={`Stage ${selectedInTree.length} selected`}
          >
            <Plus className="h-3 w-3 mr-1" />
            {selectedInTree.length}
          </Button>
        )}
        {(type === 'unstaged' || type === 'untracked') && selectedInTree.length <= 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleStageAll}
            title="Stage all"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      <CollapsibleContent>
        <div className="ml-4 space-y-0.5">
          {files.map((file) => (
            <FileItem
              key={file.path}
              entry={file}
              type={type}
              allFilePaths={allFilePaths}
              onDiscardRequest={onDiscardRequest}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
