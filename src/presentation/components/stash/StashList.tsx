import { Archive } from 'lucide-react';
import { StashItem } from './StashItem';
import type { Stash } from '@/domain/entities';

interface StashListProps {
  stashes: Stash[];
  onAction: () => void;
}

export function StashList({ stashes, onAction }: StashListProps) {
  if (stashes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Archive className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No stashed changes</p>
        <p className="text-xs mt-1">
          Use "Stash Changes" to save your work in progress
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stashes.map((stash) => (
        <StashItem key={stash.index} stash={stash} onAction={onAction} />
      ))}
    </div>
  );
}
