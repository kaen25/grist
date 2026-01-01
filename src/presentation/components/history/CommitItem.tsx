import { cn } from '@/lib/utils';
import type { Commit } from '@/domain/entities';

interface CommitItemProps {
  commit: Commit;
  isSelected: boolean;
  onSelect: () => void;
}

function formatRef(ref: string): {
  label: string;
  isHead: boolean;
  isTag: boolean;
  isRemote: boolean;
} {
  const isHead = ref.startsWith('HEAD -> ');
  const isTag = ref.startsWith('tag: ') || ref.includes('refs/tags/');
  const isRemote = ref.includes('origin/') || ref.includes('refs/remotes/');
  let label = ref
    .replace('HEAD -> ', '')
    .replace('tag: ', '')
    .replace('refs/heads/', '')
    .replace('refs/tags/', '')
    .replace('refs/remotes/', '');
  return { label, isHead, isTag, isRemote };
}

// Simple avatar with initials
function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
      {initials}
    </div>
  );
}

export function CommitItem({ commit, isSelected, onSelect }: CommitItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full h-full text-left pl-2 pr-4 flex items-center gap-2 border-b hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent'
      )}
    >
      {/* Branch/Tag badges - outline style */}
      {commit.refs.length > 0 && (
        <div className="flex gap-1 flex-shrink-0">
          {commit.refs.slice(0, 3).map((ref) => {
            const { label, isHead, isTag, isRemote } = formatRef(ref);
            return (
              <span
                key={ref}
                className={cn(
                  'px-1.5 rounded text-xs font-medium border truncate max-w-[100px] leading-tight',
                  isTag && 'border-amber-500 text-amber-500',
                  !isTag && isRemote && 'border-red-500 text-red-500',
                  !isTag && !isRemote && 'border-green-500 text-green-500',
                  isHead && 'font-bold'
                )}
                title={label}
              >
                {label}
              </span>
            );
          })}
          {commit.refs.length > 3 && (
            <span className="px-1.5 rounded text-xs border border-muted-foreground text-muted-foreground leading-tight">
              +{commit.refs.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Commit message */}
      <div className="flex-1 min-w-0 truncate text-sm">
        {commit.subject}
      </div>

      {/* Author avatar */}
      <AuthorAvatar name={commit.author_name} />

      {/* Short hash */}
      <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
        {commit.short_hash}
      </span>
    </button>
  );
}
