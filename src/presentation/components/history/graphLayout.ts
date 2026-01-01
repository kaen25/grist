import type { Commit } from '@/domain/entities';

export interface GraphNode {
  commit: Commit;
  column: number;
  row: number;
  parentConnections: {
    parentRow: number;
    parentColumn: number;
  }[];
}

export interface GraphLayout {
  nodes: GraphNode[];
  maxColumn: number;
}

const BRANCH_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
];

export function getColumnColor(column: number): string {
  return BRANCH_COLORS[column % BRANCH_COLORS.length];
}

export function calculateGraphLayout(commits: Commit[]): GraphLayout {
  if (commits.length === 0) {
    return { nodes: [], maxColumn: 0 };
  }

  const hashToIndex = new Map<string, number>();
  commits.forEach((c, i) => hashToIndex.set(c.hash, i));

  const nodes: GraphNode[] = [];
  const activeColumns: (string | null)[] = [];
  let maxColumn = 0;

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];

    // Find or assign column for this commit
    let column = activeColumns.indexOf(commit.hash);
    if (column === -1) {
      // Find first free column
      column = activeColumns.indexOf(null);
      if (column === -1) {
        column = activeColumns.length;
        activeColumns.push(commit.hash);
      } else {
        activeColumns[column] = commit.hash;
      }
    }

    maxColumn = Math.max(maxColumn, column);

    // Calculate parent connections
    const parentConnections: GraphNode['parentConnections'] = [];

    for (let i = 0; i < commit.parent_hashes.length; i++) {
      const parentHash = commit.parent_hashes[i];
      const parentRow = hashToIndex.get(parentHash);

      if (parentRow !== undefined) {
        // First parent continues in same column, others branch
        let parentColumn: number;

        if (i === 0) {
          parentColumn = column;
          activeColumns[column] = parentHash;
        } else {
          // Merge commit - find or create column for second parent
          let pc = activeColumns.indexOf(parentHash);
          if (pc === -1) {
            pc = activeColumns.indexOf(null);
            if (pc === -1) {
              pc = activeColumns.length;
              activeColumns.push(parentHash);
            } else {
              activeColumns[pc] = parentHash;
            }
          }
          parentColumn = pc;
          maxColumn = Math.max(maxColumn, parentColumn);
        }

        parentConnections.push({
          parentRow,
          parentColumn,
        });
      }
    }

    // Clear column if no parent continues
    if (commit.parent_hashes.length === 0) {
      activeColumns[column] = null;
    }

    nodes.push({
      commit,
      column,
      row,
      parentConnections,
    });
  }

  return { nodes, maxColumn };
}
