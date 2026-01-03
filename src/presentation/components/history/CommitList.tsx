import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CommitItem } from './CommitItem';
import type { Commit } from '@/domain/entities';
import { ROW_HEIGHT } from '@/settings';

interface CommitListProps {
  commits: Commit[];
  selectedHash: string | null;
  onSelect: (hash: string | null) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  onVisibleRangeChange?: (range: { start: number; end: number }) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export function CommitList({
  commits,
  selectedHash,
  onSelect,
  onLoadMore,
  isLoading,
  hasMore,
  onVisibleRangeChange,
  scrollRef,
}: CommitListProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const parentRef = scrollRef || internalRef;

  const virtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Load more when scrolling near the end
  useEffect(() => {
    const [lastItem] = [...virtualItems].reverse();
    if (!lastItem) return;

    if (lastItem.index >= commits.length - 10 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [virtualItems, commits.length, hasMore, isLoading, onLoadMore]);

  // Notify parent of visible range changes
  useEffect(() => {
    if (virtualItems.length > 0 && onVisibleRangeChange) {
      onVisibleRangeChange({
        start: virtualItems[0].index,
        end: virtualItems[virtualItems.length - 1].index,
      });
    }
  }, [virtualItems, onVisibleRangeChange]);

  if (commits.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No commits found
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const commit = commits[virtualRow.index];
          return (
            <div
              key={commit.hash}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CommitItem
                commit={commit}
                isSelected={commit.hash === selectedHash}
                onSelect={() => onSelect(commit.hash)}
              />
            </div>
          );
        })}
      </div>
      {isLoading && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Loading more commits...
        </div>
      )}
    </div>
  );
}
