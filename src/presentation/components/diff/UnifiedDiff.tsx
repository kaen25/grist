import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DiffHunk, DiffLineType } from '@/domain/value-objects';

interface LineSelectionProps {
  isLineSelected: (hunkIndex: number, lineIndex: number) => boolean;
  handleLineClick: (
    hunkIndex: number,
    lineIndex: number,
    e: React.MouseEvent,
    allLines: { hunkIndex: number; lineIndex: number }[]
  ) => void;
}

interface UnifiedDiffProps {
  hunks: DiffHunk[];
  lineSelection?: LineSelectionProps;
}

const lineStyles: Record<DiffLineType, string> = {
  Context: 'bg-transparent',
  Addition: 'bg-green-500/10 text-green-700 dark:text-green-400',
  Deletion: 'bg-red-500/10 text-red-700 dark:text-red-400',
  Header: 'bg-muted text-muted-foreground',
};

export function UnifiedDiff({ hunks, lineSelection }: UnifiedDiffProps) {
  // Build flat list of all lines for shift+click range selection
  const allLines = useMemo(() => {
    const lines: { hunkIndex: number; lineIndex: number }[] = [];
    hunks.forEach((hunk, hunkIndex) => {
      hunk.lines.forEach((_, lineIndex) => {
        lines.push({ hunkIndex, lineIndex });
      });
    });
    return lines;
  }, [hunks]);

  const handleClick = (hunkIndex: number, lineIndex: number, e: React.MouseEvent) => {
    lineSelection?.handleLineClick(hunkIndex, lineIndex, e, allLines);
  };

  return (
    <div className="min-w-fit">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex}>
          {/* Hunk header */}
          <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-4 py-1 text-xs text-muted-foreground border-y">
            {hunk.header}
          </div>

          {/* Diff lines */}
          <table className="w-full border-collapse">
            <tbody>
              {hunk.lines.map((line, lineIndex) => {
                const isSelected = lineSelection?.isLineSelected(hunkIndex, lineIndex) ?? false;
                return (
                  <tr
                    key={lineIndex}
                    className={cn(
                      'cursor-pointer hover:bg-accent/50',
                      lineStyles[line.line_type],
                      isSelected && 'ring-2 ring-inset ring-primary bg-primary/20'
                    )}
                    onClick={(e) => handleClick(hunkIndex, lineIndex, e)}
                  >
                    {/* Old line number */}
                    <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                      {line.old_line_number ?? ''}
                    </td>
                    {/* New line number */}
                    <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                      {line.new_line_number ?? ''}
                    </td>
                    {/* Prefix */}
                    <td className="w-6 select-none text-center">
                      {line.line_type === 'Addition'
                        ? '+'
                        : line.line_type === 'Deletion'
                        ? '-'
                        : ' '}
                    </td>
                    {/* Content */}
                    <td className="whitespace-pre px-2">{line.content}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
