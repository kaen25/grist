import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileItem } from './FileItem';
import { useStagingActions } from '@/application/hooks';
import type { StatusEntry } from '@/domain/entities';

interface FileTreeProps {
  title: string;
  files: StatusEntry[];
  type: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
  onDiscardRequest?: (path: string, isUntracked: boolean) => void;
}

export function FileTree({ title, files, type, onDiscardRequest }: FileTreeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { stageAll, unstageAll } = useStagingActions();

  if (files.length === 0) return null;

  const handleStageAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await stageAll();
  };

  const handleUnstageAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await unstageAll();
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
        {type === 'staged' && (
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
        {(type === 'unstaged' || type === 'untracked') && (
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
              onDiscardRequest={onDiscardRequest}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
