import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { FileDiff } from '@/domain/value-objects';

interface DiffHeaderProps {
  diff: FileDiff;
  children?: ReactNode;
}

export function DiffHeader({ diff, children }: DiffHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-2">
      <div className="flex items-center gap-2">
        <span className="font-medium">{diff.new_path}</span>
        {diff.is_binary && (
          <Badge variant="secondary">Binary</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          <span className="text-green-500">+{diff.additions}</span>
          {' / '}
          <span className="text-red-500">-{diff.deletions}</span>
        </span>
      </div>
      {children}
    </div>
  );
}
