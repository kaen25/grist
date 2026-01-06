# Phase 10: Commit Graph SVG

## Objectif
Visualiser les branches avec un graph SVG interactif.

---

## Architecture DDD

### Value Objects (src/domain/value-objects/)

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `GraphNode` | `graph-node.vo.ts` | Noeud du graph (commit + position) |
| `GraphLayout` | `graph-layout.vo.ts` | Layout complet (nodes + maxColumn) |
| `GraphConnection` | `graph-connection.vo.ts` | Connexion entre noeuds |

### Domain Services (src/domain/services/)

```typescript
// src/domain/services/graph-layout-calculator.service.ts
import type { Commit } from '@/domain/entities';
import type { GraphNode, GraphLayout } from '@/domain/value-objects';

export const GraphLayoutCalculator = {
  calculateLayout(commits: Commit[]): GraphLayout {
    // ... algorithme d'assignation des colonnes
  },
};

// src/domain/services/graph-color-provider.service.ts
export const GraphColorProvider = {
  getColumnColor(column: number): string {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return colors[column % colors.length];
  },
};
```

### Mapping des chemins

| Ancien | Nouveau |
|--------|---------|
| `src/components/history/graphLayout.ts` | `src/domain/services/graph-layout-calculator.service.ts` |
| `src/components/history/CommitGraph.tsx` | `src/presentation/components/history/CommitGraph.tsx` |

---

## Tâche 10.1: Algorithme de layout graph

**Commit**: `feat: add graph layout algorithm`

**Fichiers**:
- `src/components/history/graphLayout.ts`

**Actions**:
- [x] Créer `src/presentation/components/history/graphLayout.ts`:
```typescript
import type { Commit } from '@/types/git';

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

  // Clean up unused columns and renumber
  return { nodes, maxColumn };
}
```

---

## Tâche 10.2: Créer CommitGraph SVG

**Commit**: `feat: add CommitGraph SVG component`

**Fichiers**:
- `src/components/history/CommitGraph.tsx`

**Actions**:
- [x] Créer `src/presentation/components/history/CommitGraph.tsx`:
```typescript
import { useMemo } from 'react';
import { calculateGraphLayout, getColumnColor, type GraphNode } from './graphLayout';
import type { Commit } from '@/types/git';

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

  // Only render visible nodes and connections
  const visibleNodes = layout.nodes.filter(
    (node) => node.row >= visibleRange.start - 5 && node.row <= visibleRange.end + 5
  );

  return (
    <svg
      width={width}
      height={height}
      className="shrink-0"
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
        <GraphNode
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

interface GraphNodeProps {
  node: GraphNode;
  rowHeight: number;
  columnWidth: number;
  padding: number;
  isSelected: boolean;
  onClick: () => void;
}

function GraphNode({
  node,
  rowHeight,
  columnWidth,
  padding,
  isSelected,
  onClick,
}: GraphNodeProps) {
  const cx = padding + node.column * columnWidth + columnWidth / 2;
  const cy = node.row * rowHeight + rowHeight / 2;
  const color = getColumnColor(node.column);

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
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
      <circle cx={cx} cy={cy} r={NODE_RADIUS} fill={color} />
      {/* Hover area */}
      <circle
        cx={cx}
        cy={cy}
        r={NODE_RADIUS + 4}
        fill="transparent"
        className="hover:fill-current hover:fill-opacity-10"
      />
    </g>
  );
}
```

---

## Tâche 10.3: Interactivité graph

**Commit**: `feat: add graph interactivity`

**Fichiers**:
- `src/components/history/CommitGraph.tsx` (mise à jour)

**Actions**:
- [x] Ajouter hover state au GraphNode:
```typescript
// Dans GraphNode component, ajouter:
const [isHovered, setIsHovered] = useState(false);

// Ajouter au groupe g:
onMouseEnter={() => setIsHovered(true)}
onMouseLeave={() => setIsHovered(false)}

// Afficher tooltip au hover:
{isHovered && (
  <title>{node.commit.short_hash}: {node.commit.subject}</title>
)}
```
- [x] Ajouter style visuel au hover (agrandir cercle)

---

## Tâche 10.4: Synchroniser graph et liste

**Commit**: `feat: synchronize graph with commit list`

**Fichiers**:
- `src/components/history/HistoryView.tsx` (mise à jour)
- `src/components/history/CommitList.tsx` (mise à jour)

**Actions**:
- [x] Mettre à jour `CommitList.tsx` pour exposer le scroll et visible range:
```typescript
// Ajouter props:
interface CommitListProps {
  // ... existing
  onVisibleRangeChange?: (range: { start: number; end: number }) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

// Dans le composant:
const visibleItems = virtualizer.getVirtualItems();
useEffect(() => {
  if (visibleItems.length > 0 && onVisibleRangeChange) {
    onVisibleRangeChange({
      start: visibleItems[0].index,
      end: visibleItems[visibleItems.length - 1].index,
    });
  }
}, [visibleItems, onVisibleRangeChange]);
```
- [x] Mettre à jour `HistoryView.tsx` pour inclure le graph:
```typescript
import { CommitGraph } from './CommitGraph';

// Dans le composant:
const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
const ROW_HEIGHT = 60;

// Dans le JSX, panel gauche:
<ResizablePanel defaultSize={50} minSize={30}>
  <div className="flex h-full">
    <CommitGraph
      commits={commits}
      rowHeight={ROW_HEIGHT}
      selectedHash={selectedCommit}
      onSelect={setSelectedCommit}
      visibleRange={visibleRange}
    />
    <div className="flex-1">
      <CommitList
        commits={commits}
        selectedHash={selectedCommit}
        onSelect={setSelectedCommit}
        onLoadMore={loadMore}
        isLoading={isLoading}
        hasMore={hasMore}
        onVisibleRangeChange={setVisibleRange}
      />
    </div>
  </div>
</ResizablePanel>
```
- [x] Synchroniser le scroll entre graph et liste (via CommitListWithGraph)

---

## Progression: 4/4
