import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileItem } from './FileItem';
import type { StatusEntry } from '@/domain/entities';

interface FileTreeProps {
  title: string;
  files: StatusEntry[];
  type: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
}

export function FileTree({ title, files, type }: FileTreeProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (files.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 px-2"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="flex-1 text-left">{title}</span>
          <Badge variant="secondary" className="ml-auto">
            {files.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 space-y-0.5">
          {files.map((file) => (
            <FileItem key={file.path} entry={file} type={type} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
