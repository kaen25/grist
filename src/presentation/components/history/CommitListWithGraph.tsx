import { useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CommitItem } from './CommitItem';
import { calculateGraphLayout, getColumnColor } from './graphLayout';
import type { Commit } from '@/domain/entities';

interface CommitListWithGraphProps {
  commits: Commit[];
  selectedHash: string | null;
  onSelect: (hash: string | null) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

const ROW_HEIGHT = 64;
const COLUMN_WIDTH = 16;
const NODE_RADIUS = 4;
const GRAPH_PADDING = 10;

export function CommitListWithGraph({
  commits,
  selectedHash,
  onSelect,
  onLoadMore,
  isLoading,
  hasMore,
}: CommitListWithGraphProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => calculateGraphLayout(commits), [commits]);
  const graphWidth = (layout.maxColumn + 1) * COLUMN_WIDTH + GRAPH_PADDING * 2;

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

  if (commits.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No commits found
      </div>
    );
  }

  const totalHeight = virtualizer.getTotalSize();

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${totalHeight}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* SVG Graph - positioned absolutely to cover the full height */}
        <svg
          width={graphWidth}
          height={totalHeight}
          className="absolute left-0 top-0 pointer-events-none"
          style={{ minWidth: graphWidth }}
        >
          {/* Only render visible connections and nodes */}
          {virtualItems.map((virtualRow) => {
            const node = layout.nodes[virtualRow.index];
            if (!node) return null;

            return (
              <g key={node.commit.hash}>
                {/* Connections to parents */}
                {node.parentConnections.map((conn, idx) => {
                  const x1 = GRAPH_PADDING + node.column * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                  const y1 = node.row * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const x2 = GRAPH_PADDING + conn.parentColumn * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                  const y2 = conn.parentRow * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const color = getColumnColor(node.column);

                  if (node.column === conn.parentColumn) {
                    return (
                      <line
                        key={`${node.commit.hash}-conn-${idx}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={color}
                        strokeWidth={2}
                      />
                    );
                  }

                  // Curved line for merges/branches
                  const midY = y1 + (y2 - y1) / 3;
                  return (
                    <path
                      key={`${node.commit.hash}-conn-${idx}`}
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      stroke={color}
                      strokeWidth={2}
                      fill="none"
                    />
                  );
                })}

                {/* Node circle */}
                <circle
                  cx={GRAPH_PADDING + node.column * COLUMN_WIDTH + COLUMN_WIDTH / 2}
                  cy={node.row * ROW_HEIGHT + ROW_HEIGHT / 2}
                  r={NODE_RADIUS}
                  fill={getColumnColor(node.column)}
                />

                {/* Selection highlight */}
                {node.commit.hash === selectedHash && (
                  <circle
                    cx={GRAPH_PADDING + node.column * COLUMN_WIDTH + COLUMN_WIDTH / 2}
                    cy={node.row * ROW_HEIGHT + ROW_HEIGHT / 2}
                    r={NODE_RADIUS + 3}
                    fill="none"
                    stroke={getColumnColor(node.column)}
                    strokeWidth={2}
                    opacity={0.5}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Commit items */}
        {virtualItems.map((virtualRow) => {
          const commit = commits[virtualRow.index];
          return (
            <div
              key={commit.hash}
              style={{
                position: 'absolute',
                top: 0,
                left: graphWidth,
                right: 0,
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
