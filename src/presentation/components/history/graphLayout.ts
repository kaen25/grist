import type { Commit } from '@/domain/entities';

// =============================================================================
// Types
// =============================================================================

export interface GraphNode {
  commit: Commit;
  column: number;
  row: number;
  color: string;
  isMerge: boolean;
  isBranchTip: boolean;
}

export interface GraphEdge {
  fromRow: number;
  fromColumn: number;
  toRow: number;
  toColumn: number;
  color: string;
  isMergeEdge: boolean;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  maxColumn: number;
}

// =============================================================================
// Color Palette
// =============================================================================

const BRANCH_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#84cc16', // lime
  '#14b8a6', // teal
  '#a855f7', // purple
  '#6366f1', // indigo
];

export function getColumnColor(column: number): string {
  return BRANCH_COLORS[column % BRANCH_COLORS.length];
}

// =============================================================================
// Straight Branch Algorithm with Proper Column Reuse
// =============================================================================

interface EdgeInterval {
  startRow: number;
  endRow: number;
  column: number;
}

export function calculateGraphLayout(commits: Commit[]): GraphLayout {
  if (commits.length === 0) {
    return { nodes: [], edges: [], maxColumn: 0 };
  }

  // Build lookup maps
  const hashToRow = new Map<string, number>();
  commits.forEach((c, i) => hashToRow.set(c.hash, i));

  // Track branch tips
  const hasChildren = new Set<string>();
  commits.forEach((c) => {
    c.parent_hashes.forEach((ph) => hasChildren.add(ph));
  });

  const branchTips = new Set<string>();
  commits.forEach((c) => {
    if ((c.refs && c.refs.length > 0) || !hasChildren.has(c.hash)) {
      branchTips.add(c.hash);
    }
  });

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Track edge intervals: which rows each column is occupied
  const edgeIntervals: EdgeInterval[] = [];

  // Track commit -> column assignment for continuing branches
  const commitColumn = new Map<string, number>();
  const commitColor = new Map<string, string>();

  let colorIndex = 0;
  let maxColumn = 0;

  // Process commits from top to bottom
  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];
    const isMerge = commit.parent_hashes.length > 1;
    const isBranchTip = branchTips.has(commit.hash);

    let column: number;
    let nodeColor: string;

    // Check if this commit was assigned a column by a child
    if (commitColumn.has(commit.hash)) {
      column = commitColumn.get(commit.hash)!;
      nodeColor = commitColor.get(commit.hash)!;
    } else {
      // Find first column that's free at this row
      column = findFreeColumnAtRow(row, edgeIntervals);
      nodeColor = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];
      colorIndex++;
    }

    maxColumn = Math.max(maxColumn, column);

    // Create node
    const node: GraphNode = {
      commit,
      column,
      row,
      color: nodeColor,
      isMerge,
      isBranchTip,
    };
    nodes.push(node);

    // Process parents
    const parentCount = commit.parent_hashes.length;

    if (parentCount > 0) {
      // First parent
      const firstParentHash = commit.parent_hashes[0];
      const firstParentRow = hashToRow.get(firstParentHash);

      if (firstParentRow !== undefined) {
        let parentCol: number;

        // Check if parent already has a column assigned (by another child)
        if (commitColumn.has(firstParentHash)) {
          // Parent already assigned - edge goes to that column
          parentCol = commitColumn.get(firstParentHash)!;
        } else {
          // First child to claim this parent - use same column
          parentCol = column;
          commitColumn.set(firstParentHash, parentCol);
          commitColor.set(firstParentHash, nodeColor);
        }

        // Edge color is always the child's (current node's) color
        // This ensures branch deviations use the new branch's color
        const edgeColor = nodeColor;

        // Add edge interval
        edgeIntervals.push({
          startRow: row,
          endRow: firstParentRow,
          column: parentCol,
        });

        edges.push({
          fromRow: row,
          fromColumn: column,
          toRow: firstParentRow,
          toColumn: parentCol,
          color: edgeColor,
          isMergeEdge: false,
        });
      }

      // Additional parents (merges)
      for (let pi = 1; pi < parentCount; pi++) {
        const parentHash = commit.parent_hashes[pi];
        const parentRow = hashToRow.get(parentHash);

        if (parentRow === undefined) continue;

        let parentColumn: number;
        let parentColor: string;

        // Check if parent already has a column
        if (commitColumn.has(parentHash)) {
          parentColumn = commitColumn.get(parentHash)!;
          parentColor = commitColor.get(parentHash)!;
        } else {
          // Find free column for the entire range from this commit to parent
          parentColumn = findFreeColumnForRange(row, parentRow, edgeIntervals, column);
          parentColor = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];
          colorIndex++;

          commitColumn.set(parentHash, parentColumn);
          commitColor.set(parentHash, parentColor);
        }

        maxColumn = Math.max(maxColumn, parentColumn);

        // Add edge interval
        edgeIntervals.push({
          startRow: row,
          endRow: parentRow,
          column: parentColumn,
        });

        edges.push({
          fromRow: row,
          fromColumn: column,
          toRow: parentRow,
          toColumn: parentColumn,
          color: parentColor,
          isMergeEdge: true,
        });
      }
    }
  }

  return { nodes, edges, maxColumn };
}

// Find a column that has no edge passing through the given row
function findFreeColumnAtRow(row: number, intervals: EdgeInterval[]): number {
  let col = 0;
  while (isColumnOccupiedAtRow(col, row, intervals)) {
    col++;
  }
  return col;
}

// Find a column that has no edge passing through any row in [startRow, endRow]
function findFreeColumnForRange(
  startRow: number,
  endRow: number,
  intervals: EdgeInterval[],
  excludeColumn: number
): number {
  let col = 0;
  while (true) {
    if (col === excludeColumn) {
      col++;
      continue;
    }
    if (!isColumnOccupiedInRange(col, startRow, endRow, intervals)) {
      return col;
    }
    col++;
  }
}

// Check if a column has an edge passing through a specific row
function isColumnOccupiedAtRow(column: number, row: number, intervals: EdgeInterval[]): boolean {
  for (const interval of intervals) {
    if (interval.column === column && interval.startRow <= row && interval.endRow >= row) {
      return true;
    }
  }
  return false;
}

// Check if a column has an edge passing through any row in range
function isColumnOccupiedInRange(
  column: number,
  startRow: number,
  endRow: number,
  intervals: EdgeInterval[]
): boolean {
  for (const interval of intervals) {
    if (interval.column === column) {
      // Check if intervals overlap
      if (interval.startRow <= endRow && interval.endRow >= startRow) {
        return true;
      }
    }
  }
  return false;
}

// =============================================================================
// Lane Segments Helper
// =============================================================================

export interface LaneSegment {
  column: number;
  startRow: number;
  endRow: number;
  color: string;
}

export function calculateLaneSegments(nodes: GraphNode[]): LaneSegment[] {
  const segments: LaneSegment[] = [];
  const activeSegments = new Map<number, { startRow: number; color: string }>();

  for (const node of nodes) {
    const { column, row, color } = node;

    if (!activeSegments.has(column)) {
      activeSegments.set(column, { startRow: row, color });
    } else {
      const segment = activeSegments.get(column)!;
      if (segment.color !== color) {
        segments.push({
          column,
          startRow: segment.startRow,
          endRow: row - 1,
          color: segment.color,
        });
        activeSegments.set(column, { startRow: row, color });
      }
    }
  }

  const lastRow = nodes.length > 0 ? nodes[nodes.length - 1].row : 0;
  for (const [column, segment] of activeSegments.entries()) {
    segments.push({
      column,
      startRow: segment.startRow,
      endRow: lastRow,
      color: segment.color,
    });
  }

  return segments;
}
