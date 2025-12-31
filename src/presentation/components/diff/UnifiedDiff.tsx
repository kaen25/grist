import { cn } from '@/lib/utils';
import type { DiffHunk, DiffLineType } from '@/domain/value-objects';

interface UnifiedDiffProps {
  hunks: DiffHunk[];
}

const lineStyles: Record<DiffLineType, string> = {
  Context: 'bg-transparent',
  Addition: 'bg-green-500/10 text-green-700 dark:text-green-400',
  Deletion: 'bg-red-500/10 text-red-700 dark:text-red-400',
  Header: 'bg-muted text-muted-foreground',
};

export function UnifiedDiff({ hunks }: UnifiedDiffProps) {
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
              {hunk.lines.map((line, lineIndex) => (
                <tr
                  key={lineIndex}
                  className={cn('hover:bg-accent/50', lineStyles[line.line_type])}
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
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
