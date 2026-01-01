import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CommitMessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SUBJECT_LIMIT = 72;
const SUBJECT_WARNING = 50;

export function CommitMessageEditor({
  value,
  onChange,
  disabled,
}: CommitMessageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const subjectLine = lines[0] || '';
  const subjectLength = subjectLine.length;

  // Sync scroll between textarea and highlight overlay
  useEffect(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;

    const syncScroll = () => {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener('scroll', syncScroll);
    return () => textarea.removeEventListener('scroll', syncScroll);
  }, []);

  // Build highlighted content
  const renderHighlightedContent = () => {
    return lines.map((line, lineIndex) => {
      if (lineIndex === 0) {
        // Subject line - highlight overflow
        if (line.length <= SUBJECT_WARNING) {
          return <div key={lineIndex}>{line || '\u00A0'}</div>;
        } else if (line.length <= SUBJECT_LIMIT) {
          // Yellow zone (50-72)
          return (
            <div key={lineIndex}>
              {line.slice(0, SUBJECT_WARNING)}
              <span className="bg-yellow-500/30 rounded-sm">{line.slice(SUBJECT_WARNING)}</span>
            </div>
          );
        } else {
          // Red zone (72+)
          return (
            <div key={lineIndex}>
              {line.slice(0, SUBJECT_WARNING)}
              <span className="bg-yellow-500/30 rounded-sm">{line.slice(SUBJECT_WARNING, SUBJECT_LIMIT)}</span>
              <span className="bg-destructive/40 rounded-sm">{line.slice(SUBJECT_LIMIT)}</span>
            </div>
          );
        }
      }
      // Body lines - no highlighting
      return <div key={lineIndex}>{line || '\u00A0'}</div>;
    });
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        {/* Highlight overlay - behind the textarea */}
        <div
          ref={highlightRef}
          className="absolute inset-0 p-2 font-mono text-sm whitespace-pre-wrap break-words overflow-hidden pointer-events-none text-transparent"
          aria-hidden="true"
        >
          {renderHighlightedContent()}
        </div>
        {/* Actual textarea - transparent background to show highlights */}
        <textarea
          ref={textareaRef}
          placeholder="Commit message (Ctrl+Enter to commit)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "relative w-full min-h-[80px] resize-none font-mono text-sm p-2 rounded-md border border-input bg-transparent",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "placeholder:text-muted-foreground"
          )}
          rows={4}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className={cn(
          subjectLength > SUBJECT_LIMIT && 'text-destructive',
          subjectLength > SUBJECT_WARNING && subjectLength <= SUBJECT_LIMIT && 'text-yellow-600'
        )}>
          {subjectLength}
        </span>
        <span className="opacity-50">
          Ctrl+Enter to commit
        </span>
      </div>
    </div>
  );
}
