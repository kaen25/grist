import { useState, useCallback } from 'react';

export interface LineKey {
  hunkIndex: number;
  lineIndex: number;
}

function lineKeyToString(key: LineKey): string {
  return `${key.hunkIndex}:${key.lineIndex}`;
}

function stringToLineKey(str: string): LineKey {
  const [hunkIndex, lineIndex] = str.split(':').map(Number);
  return { hunkIndex, lineIndex };
}

export function useDiffLineSelection() {
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [lastClickedLine, setLastClickedLine] = useState<LineKey | null>(null);

  const isLineSelected = useCallback(
    (hunkIndex: number, lineIndex: number) => {
      return selectedLines.has(lineKeyToString({ hunkIndex, lineIndex }));
    },
    [selectedLines]
  );

  const handleLineClick = useCallback(
    (
      hunkIndex: number,
      lineIndex: number,
      e: React.MouseEvent,
      allLines: { hunkIndex: number; lineIndex: number }[]
    ) => {
      const key = lineKeyToString({ hunkIndex, lineIndex });

      if (e.shiftKey && lastClickedLine) {
        // Shift+click: range selection
        const lastKey = lineKeyToString(lastClickedLine);
        const lastIdx = allLines.findIndex(
          (l) => lineKeyToString({ hunkIndex: l.hunkIndex, lineIndex: l.lineIndex }) === lastKey
        );
        const currentIdx = allLines.findIndex(
          (l) => lineKeyToString({ hunkIndex: l.hunkIndex, lineIndex: l.lineIndex }) === key
        );

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const newSelection = new Set(selectedLines);

          for (let i = start; i <= end; i++) {
            const line = allLines[i];
            newSelection.add(lineKeyToString({ hunkIndex: line.hunkIndex, lineIndex: line.lineIndex }));
          }

          setSelectedLines(newSelection);
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl+click: toggle selection
        const newSelection = new Set(selectedLines);
        if (newSelection.has(key)) {
          newSelection.delete(key);
        } else {
          newSelection.add(key);
        }
        setSelectedLines(newSelection);
        setLastClickedLine({ hunkIndex, lineIndex });
      } else {
        // Normal click: select only this line
        setSelectedLines(new Set([key]));
        setLastClickedLine({ hunkIndex, lineIndex });
      }
    },
    [selectedLines, lastClickedLine]
  );

  const clearSelection = useCallback(() => {
    setSelectedLines(new Set());
    setLastClickedLine(null);
  }, []);

  const getSelectedLines = useCallback((): LineKey[] => {
    return Array.from(selectedLines).map(stringToLineKey);
  }, [selectedLines]);

  return {
    isLineSelected,
    handleLineClick,
    clearSelection,
    getSelectedLines,
    selectedCount: selectedLines.size,
  };
}
