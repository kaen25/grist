import { useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CommitItem } from './CommitItem';
import { calculateGraphLayout, type GraphNode, type GraphEdge } from './graphLayout';
import type { Commit } from '@/domain/entities';
import './CommitListWithGraph.css';

interface CommitListWithGraphProps {
  commits: Commit[];
  selectedHash: string | null;
  onSelect: (hash: string | null) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const ROW_HEIGHT = 32;
const COLUMN_WIDTH = 18;
const NODE_RADIUS = 4;
const NODE_RADIUS_MERGE = 5;
const GRAPH_PADDING = 10;
const LINE_WIDTH = 1.5;

// =============================================================================
// SVG Path Helpers
// =============================================================================

function getNodeCenter(row: number, column: number): { x: number; y: number } {
  return {
    x: GRAPH_PADDING + column * COLUMN_WIDTH + COLUMN_WIDTH / 2,
    y: row * ROW_HEIGHT + ROW_HEIGHT / 2,
  };
}

function createEdgePath(edge: GraphEdge): string {
  const from = getNodeCenter(edge.fromRow, edge.fromColumn);
  const to = getNodeCenter(edge.toRow, edge.toColumn);

  if (edge.fromColumn === edge.toColumn) {
    // Straight vertical line
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  // Curved line (cubic Bézier)
  // Control points create smooth S-curve
  const midY = from.y + (to.y - from.y) * 0.4;

  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

// =============================================================================
// Component
// =============================================================================

export function CommitListWithGraph({
  commits,
  selectedHash,
  onSelect,
  onLoadMore,
  isLoading,
  hasMore,
}: CommitListWithGraphProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate graph layout
  const layout = useMemo(() => calculateGraphLayout(commits), [commits]);
  const graphWidth = (layout.maxColumn + 1) * COLUMN_WIDTH + GRAPH_PADDING * 2;

  // Build lookup maps for quick access
  const nodeByRow = useMemo(() => {
    const map = new Map<number, GraphNode>();
    layout.nodes.forEach((node) => map.set(node.row, node));
    return map;
  }, [layout.nodes]);

  const virtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
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

  // Determine visible range for edge rendering
  const visibleStart = virtualItems.length > 0 ? virtualItems[0].index : 0;
  const visibleEnd = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;
  const bufferRows = 10;

  // Filter edges that intersect with visible range (with buffer)
  const visibleEdges = layout.edges.filter((edge) => {
    const minRow = Math.min(edge.fromRow, edge.toRow);
    const maxRow = Math.max(edge.fromRow, edge.toRow);
    return maxRow >= visibleStart - bufferRows && minRow <= visibleEnd + bufferRows;
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${totalHeight}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* SVG Graph */}
        <svg
          width={graphWidth}
          height={totalHeight}
          className="absolute left-0 top-0"
          style={{ minWidth: graphWidth }}
        >
          {/* Render edges (connections) first - behind nodes */}
          <g className="edges">
            {visibleEdges.map((edge, idx) => (
              <path
                key={`edge-${idx}`}
                className="graph-edge"
                d={createEdgePath(edge)}
                stroke={edge.color}
                strokeWidth={LINE_WIDTH}
                fill="none"
                strokeLinecap="round"
                opacity={0.8}
              />
            ))}
          </g>

          {/* Render nodes */}
          <g className="nodes">
            {virtualItems.map((virtualRow) => {
              const node = nodeByRow.get(virtualRow.index);
              if (!node) return null;

              const { x, y } = getNodeCenter(node.row, node.column);
              const isSelected = node.commit.hash === selectedHash;
              const radius = node.isMerge ? NODE_RADIUS_MERGE : NODE_RADIUS;

              return (
                <g
                  key={node.commit.hash}
                  className="graph-node"
                  onClick={() => onSelect(node.commit.hash)}
                  style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      className="selection-ring"
                      cx={x}
                      cy={y}
                      r={radius + 4}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={2}
                    />
                  )}

                  {/* Node circle */}
                  {node.isMerge ? (
                    // Diamond shape for merge commits
                    <path
                      className="graph-node-shape"
                      d={`M ${x} ${y - radius} L ${x + radius} ${y} L ${x} ${y + radius} L ${x - radius} ${y} Z`}
                      fill={node.color}
                      stroke="var(--background)"
                      strokeWidth={1.5}
                      style={{ color: node.color }}
                    />
                  ) : (
                    // Regular circle
                    <circle
                      className="graph-node-shape"
                      cx={x}
                      cy={y}
                      r={radius}
                      fill={node.color}
                      stroke="var(--background)"
                      strokeWidth={1.5}
                      style={{ color: node.color }}
                    />
                  )}

                  {/* Branch tip indicator (larger outer ring) */}
                  {node.isBranchTip && !isSelected && (
                    <circle
                      className="branch-tip-ring"
                      cx={x}
                      cy={y}
                      r={radius + 2}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={1}
                    />
                  )}

                  {/* Hover area (invisible larger circle) */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 8}
                    fill="transparent"
                  />

                  {/* Tooltip */}
                  <title>{node.commit.short_hash}: {node.commit.subject}</title>
                </g>
              );
            })}
          </g>

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
