import { useMemo, useState } from 'react';
import { calculateGraphLayout, getColumnColor, type GraphNode } from './graphLayout';
import type { Commit } from '@/domain/entities';

interface CommitGraphProps {
  commits: Commit[];
  rowHeight: number;
  selectedHash: string | null;
  onSelect: (hash: string) => void;
  visibleRange: { start: number; end: number };
}

const COLUMN_WIDTH = 16;
const NODE_RADIUS = 4;
const PADDING = 10;

export function CommitGraph({
  commits,
  rowHeight,
  selectedHash,
  onSelect,
  visibleRange,
}: CommitGraphProps) {
  const layout = useMemo(() => calculateGraphLayout(commits), [commits]);

  const width = (layout.maxColumn + 1) * COLUMN_WIDTH + PADDING * 2;
  const height = commits.length * rowHeight;

  // Only render visible nodes and connections (with some buffer)
  const visibleNodes = layout.nodes.filter(
    (node) => node.row >= visibleRange.start - 5 && node.row <= visibleRange.end + 5
  );

  return (
    <svg
      width={width}
      height={height}
      className="flex-shrink-0"
      style={{ minWidth: width }}
    >
      {/* Render connections first (behind nodes) */}
      {visibleNodes.map((node) =>
        node.parentConnections.map((conn, idx) => (
          <GraphConnection
            key={`${node.commit.hash}-${idx}`}
            fromRow={node.row}
            fromColumn={node.column}
            toRow={conn.parentRow}
            toColumn={conn.parentColumn}
            rowHeight={rowHeight}
            columnWidth={COLUMN_WIDTH}
            padding={PADDING}
          />
        ))
      )}

      {/* Render nodes */}
      {visibleNodes.map((node) => (
        <GraphNodeCircle
          key={node.commit.hash}
          node={node}
          rowHeight={rowHeight}
          columnWidth={COLUMN_WIDTH}
          padding={PADDING}
          isSelected={node.commit.hash === selectedHash}
          onClick={() => onSelect(node.commit.hash)}
        />
      ))}
    </svg>
  );
}

interface GraphConnectionProps {
  fromRow: number;
  fromColumn: number;
  toRow: number;
  toColumn: number;
  rowHeight: number;
  columnWidth: number;
  padding: number;
}

function GraphConnection({
  fromRow,
  fromColumn,
  toRow,
  toColumn,
  rowHeight,
  columnWidth,
  padding,
}: GraphConnectionProps) {
  const x1 = padding + fromColumn * columnWidth + columnWidth / 2;
  const y1 = fromRow * rowHeight + rowHeight / 2;
  const x2 = padding + toColumn * columnWidth + columnWidth / 2;
  const y2 = toRow * rowHeight + rowHeight / 2;

  const color = getColumnColor(fromColumn);

  if (fromColumn === toColumn) {
    // Straight line
    return (
      <line
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
      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
      stroke={color}
      strokeWidth={2}
      fill="none"
    />
  );
}

interface GraphNodeCircleProps {
  node: GraphNode;
  rowHeight: number;
  columnWidth: number;
  padding: number;
  isSelected: boolean;
  onClick: () => void;
}

function GraphNodeCircle({
  node,
  rowHeight,
  columnWidth,
  padding,
  isSelected,
  onClick,
}: GraphNodeCircleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cx = padding + node.column * columnWidth + columnWidth / 2;
  const cy = node.row * rowHeight + rowHeight / 2;
  const color = getColumnColor(node.column);

  const radius = isHovered ? NODE_RADIUS + 1 : NODE_RADIUS;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Tooltip */}
      <title>{node.commit.short_hash}: {node.commit.subject}</title>

      {/* Selection highlight */}
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={NODE_RADIUS + 3}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.5}
        />
      )}

      {/* Node */}
      <circle cx={cx} cy={cy} r={radius} fill={color} />

      {/* Hover area (invisible larger circle for easier clicking) */}
      <circle
        cx={cx}
        cy={cy}
        r={NODE_RADIUS + 6}
        fill="transparent"
      />
    </g>
  );
}
