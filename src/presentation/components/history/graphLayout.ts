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
// Color Palette (12 distinct colors)
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
// Curved Branch Algorithm (GitExtensions style)
// =============================================================================

interface ActiveBranch {
  hash: string;
  color: string;
}

export function calculateGraphLayout(commits: Commit[]): GraphLayout {
  if (commits.length === 0) {
    return { nodes: [], edges: [], maxColumn: 0 };
  }

  // Build lookup maps
  const hashToRow = new Map<string, number>();
  const hashToNode = new Map<string, GraphNode>();
  commits.forEach((c, i) => hashToRow.set(c.hash, i));

  // Track which commits are branch tips (have refs or are first commit)
  const branchTips = new Set<string>();
  commits.forEach((c) => {
    if (c.refs && c.refs.length > 0) {
      branchTips.add(c.hash);
    }
  });
  // First commit is always a tip
  if (commits.length > 0) {
    branchTips.add(commits[0].hash);
  }

  // Track which commits have children (to detect branch tips)
  const hasChildren = new Set<string>();
  commits.forEach((c) => {
    c.parent_hashes.forEach((ph) => hasChildren.add(ph));
  });

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Active branches: ordered list of branches flowing through current row
  // Each entry is { hash, color } where hash is the commit we're waiting for
  const activeBranches: (ActiveBranch | null)[] = [];
  let colorIndex = 0;
  let maxColumn = 0;

  // Process commits from top (newest) to bottom (oldest)
  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];
    const isMerge = commit.parent_hashes.length > 1;
    const isBranchTip = branchTips.has(commit.hash) || !hasChildren.has(commit.hash);

    // Step 1: Find column for this commit
    let column = -1;
    let nodeColor = '';

    // Check if this commit is expected in any active branch
    for (let i = 0; i < activeBranches.length; i++) {
      if (activeBranches[i]?.hash === commit.hash) {
        column = i;
        nodeColor = activeBranches[i]!.color;
        break;
      }
    }

    // If not found, find first free slot or create new column
    if (column === -1) {
      // New branch starting - assign new color
      nodeColor = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];
      colorIndex++;

      // Find first null slot
      const freeSlot = activeBranches.indexOf(null);
      if (freeSlot !== -1) {
        column = freeSlot;
        activeBranches[freeSlot] = { hash: commit.hash, color: nodeColor };
      } else {
        column = activeBranches.length;
        activeBranches.push({ hash: commit.hash, color: nodeColor });
      }
    }

    maxColumn = Math.max(maxColumn, column);

    // Step 2: Create node
    const node: GraphNode = {
      commit,
      column,
      row,
      color: nodeColor,
      isMerge,
      isBranchTip,
    };
    nodes.push(node);
    hashToNode.set(commit.hash, node);

    // Step 3: Handle parents and create edges
    const parentCount = commit.parent_hashes.length;

    if (parentCount === 0) {
      // Root commit - clear this column
      // For curved style: remove and shift
      activeBranches.splice(column, 1);
    } else {
      // Process each parent
      for (let pi = 0; pi < parentCount; pi++) {
        const parentHash = commit.parent_hashes[pi];
        const parentRow = hashToRow.get(parentHash);

        if (parentRow === undefined) continue; // Parent not in visible commits

        if (pi === 0) {
          // First parent: continues in same column
          activeBranches[column] = { hash: parentHash, color: nodeColor };

          edges.push({
            fromRow: row,
            fromColumn: column,
            toRow: parentRow,
            toColumn: column, // Same column for first parent
            color: nodeColor,
            isMergeEdge: false,
          });
        } else {
          // Merge parent: need to find or create its column
          let parentColumn = -1;
          let parentColor = nodeColor;

          // Check if parent is already in an active column
          for (let i = 0; i < activeBranches.length; i++) {
            if (activeBranches[i]?.hash === parentHash) {
              parentColumn = i;
              parentColor = activeBranches[i]!.color;
              break;
            }
          }

          // If not, allocate new column for merge parent
          if (parentColumn === -1) {
            parentColor = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];
            colorIndex++;

            const freeSlot = activeBranches.findIndex((b, idx) => b === null && idx !== column);
            if (freeSlot !== -1) {
              parentColumn = freeSlot;
              activeBranches[freeSlot] = { hash: parentHash, color: parentColor };
            } else {
              parentColumn = activeBranches.length;
              activeBranches.push({ hash: parentHash, color: parentColor });
            }
            maxColumn = Math.max(maxColumn, parentColumn);
          }

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

    // Step 4: Clean up completed branches (curved style)
    // Remove null entries from the end to compact
    while (activeBranches.length > 0 && activeBranches[activeBranches.length - 1] === null) {
      activeBranches.pop();
    }
  }

  // Post-process: Update edge target columns based on actual node positions
  // (needed because columns can shift in curved mode)
  for (const edge of edges) {
    const targetNode = nodes.find((n) => n.row === edge.toRow);
    if (targetNode) {
      edge.toColumn = targetNode.column;
    }
  }

  return { nodes, edges, maxColumn };
}

// =============================================================================
// Helper to get continuous lane segments for rendering
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
      // Start new segment
      activeSegments.set(column, { startRow: row, color });
    } else {
      const segment = activeSegments.get(column)!;
      // If color changed or there's a gap, close old segment and start new
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

  // Close remaining segments
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
