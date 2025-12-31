import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DiffHunk, DiffLine } from '@/domain/value-objects';

interface SideBySideDiffProps {
  hunks: DiffHunk[];
}

interface SideBySideLine {
  left: DiffLine | null;
  right: DiffLine | null;
}

export function SideBySideDiff({ hunks }: SideBySideDiffProps) {
  const sideBySideLines = useMemo(() => {
    const result: { hunkHeader: string; lines: SideBySideLine[] }[] = [];

    for (const hunk of hunks) {
      const hunkLines: SideBySideLine[] = [];
      let leftBuffer: DiffLine[] = [];
      let rightBuffer: DiffLine[] = [];

      const flushBuffers = () => {
        const maxLen = Math.max(leftBuffer.length, rightBuffer.length);
        for (let i = 0; i < maxLen; i++) {
          hunkLines.push({
            left: leftBuffer[i] ?? null,
            right: rightBuffer[i] ?? null,
          });
        }
        leftBuffer = [];
        rightBuffer = [];
      };

      for (const line of hunk.lines) {
        if (line.line_type === 'Context') {
          flushBuffers();
          hunkLines.push({ left: line, right: line });
        } else if (line.line_type === 'Deletion') {
          leftBuffer.push(line);
        } else if (line.line_type === 'Addition') {
          rightBuffer.push(line);
        }
      }

      flushBuffers();
      result.push({ hunkHeader: hunk.header, lines: hunkLines });
    }

    return result;
  }, [hunks]);

  return (
    <div className="min-w-fit">
      {sideBySideLines.map((hunk, hunkIndex) => (
        <div key={hunkIndex}>
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
                  {hunk.lines.map((line, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'hover:bg-accent/50',
                        line.left?.line_type === 'Deletion' &&
                          'bg-red-500/10 text-red-700 dark:text-red-400'
                      )}
                    >
                      <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                        {line.left?.old_line_number ?? ''}
                      </td>
                      <td className="whitespace-pre px-2">
                        {line.left?.content ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right (new) */}
            <div className="flex-1">
              <table className="w-full border-collapse">
                <tbody>
                  {hunk.lines.map((line, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'hover:bg-accent/50',
                        line.right?.line_type === 'Addition' &&
                          'bg-green-500/10 text-green-700 dark:text-green-400'
                      )}
                    >
                      <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                        {line.right?.new_line_number ?? ''}
                      </td>
                      <td className="whitespace-pre px-2">
                        {line.right?.content ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
