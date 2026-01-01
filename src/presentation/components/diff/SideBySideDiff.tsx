import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DiffHunk, DiffLine } from '@/domain/value-objects';

interface LineSelectionProps {
  isLineSelected: (hunkIndex: number, lineIndex: number) => boolean;
  handleLineClick: (
    hunkIndex: number,
    lineIndex: number,
    e: React.MouseEvent,
    allLines: { hunkIndex: number; lineIndex: number }[]
  ) => void;
}

interface SideBySideDiffProps {
  hunks: DiffHunk[];
  lineSelection?: LineSelectionProps;
  wordWrap?: boolean;
  showWhitespace?: boolean;
}

function renderContent(content: string, showWhitespace: boolean): React.ReactNode {
  if (!showWhitespace) return content;

  // Replace spaces and tabs with visible characters
  return content
    .replace(/ /g, '·')
    .replace(/\t/g, '→   ')
    .replace(/\r/g, '␍')
    .replace(/\n/g, '␊');
}

interface SideBySideLine {
  left: DiffLine | null;
  right: DiffLine | null;
  leftOriginalIndex: number | null;
  rightOriginalIndex: number | null;
}

interface ProcessedHunk {
  hunkIndex: number;
  hunkHeader: string;
  lines: SideBySideLine[];
}

export function SideBySideDiff({ hunks, lineSelection, wordWrap = false, showWhitespace = false }: SideBySideDiffProps) {
  const { sideBySideLines, allLines } = useMemo(() => {
    const result: ProcessedHunk[] = [];
    const flatLines: { hunkIndex: number; lineIndex: number }[] = [];

    hunks.forEach((hunk, hunkIndex) => {
      const hunkLines: SideBySideLine[] = [];
      let leftBuffer: { line: DiffLine; originalIndex: number }[] = [];
      let rightBuffer: { line: DiffLine; originalIndex: number }[] = [];

      const flushBuffers = () => {
        const maxLen = Math.max(leftBuffer.length, rightBuffer.length);
        for (let i = 0; i < maxLen; i++) {
          hunkLines.push({
            left: leftBuffer[i]?.line ?? null,
            right: rightBuffer[i]?.line ?? null,
            leftOriginalIndex: leftBuffer[i]?.originalIndex ?? null,
            rightOriginalIndex: rightBuffer[i]?.originalIndex ?? null,
          });
        }
        leftBuffer = [];
        rightBuffer = [];
      };

      hunk.lines.forEach((line, lineIndex) => {
        flatLines.push({ hunkIndex, lineIndex });

        if (line.line_type === 'Context') {
          flushBuffers();
          hunkLines.push({
            left: line,
            right: line,
            leftOriginalIndex: lineIndex,
            rightOriginalIndex: lineIndex,
          });
        } else if (line.line_type === 'Deletion') {
          leftBuffer.push({ line, originalIndex: lineIndex });
        } else if (line.line_type === 'Addition') {
          rightBuffer.push({ line, originalIndex: lineIndex });
        }
      });

      flushBuffers();
      result.push({ hunkIndex, hunkHeader: hunk.header, lines: hunkLines });
    });

    return { sideBySideLines: result, allLines: flatLines };
  }, [hunks]);

  const handleClick = (hunkIndex: number, lineIndex: number | null, e: React.MouseEvent) => {
    if (lineIndex !== null) {
      lineSelection?.handleLineClick(hunkIndex, lineIndex, e, allLines);
    }
  };

  return (
    <div className="min-w-fit">
      {sideBySideLines.map((hunk) => (
        <div key={hunk.hunkIndex}>
          {/* Hunk header */}
          <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-4 py-1 text-xs text-muted-foreground border-y">
            {hunk.hunkHeader}
          </div>

          {/* Side by side */}
          <div className="flex">
            {/* Left (old) */}
            <div className="flex-1 border-r">
              <table className="w-full border-collapse">
                <tbody>
                  {hunk.lines.map((line, i) => {
                    const isSelected =
                      line.leftOriginalIndex !== null &&
                      lineSelection?.isLineSelected(hunk.hunkIndex, line.leftOriginalIndex);
                    return (
                      <tr
                        key={i}
                        className={cn(
                          'cursor-pointer hover:bg-accent/50',
                          line.left?.line_type === 'Deletion' &&
                            'bg-red-500/10 text-red-700 dark:text-red-400',
                          isSelected && 'ring-2 ring-inset ring-primary bg-primary/20'
                        )}
                        onClick={(e) => handleClick(hunk.hunkIndex, line.leftOriginalIndex, e)}
                      >
                        <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                          {line.left?.old_line_number ?? ''}
                        </td>
                        <td className={cn('px-2', wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre')}>
                          {renderContent(line.left?.content ?? '', showWhitespace)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right (new) */}
            <div className="flex-1">
              <table className="w-full border-collapse">
                <tbody>
                  {hunk.lines.map((line, i) => {
                    const isSelected =
                      line.rightOriginalIndex !== null &&
                      lineSelection?.isLineSelected(hunk.hunkIndex, line.rightOriginalIndex);
                    return (
                      <tr
                        key={i}
                        className={cn(
                          'cursor-pointer hover:bg-accent/50',
                          line.right?.line_type === 'Addition' &&
                            'bg-green-500/10 text-green-700 dark:text-green-400',
                          isSelected && 'ring-2 ring-inset ring-primary bg-primary/20'
                        )}
                        onClick={(e) => handleClick(hunk.hunkIndex, line.rightOriginalIndex, e)}
                      >
                        <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                          {line.right?.new_line_number ?? ''}
                        </td>
                        <td className={cn('px-2', wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre')}>
                          {renderContent(line.right?.content ?? '', showWhitespace)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
