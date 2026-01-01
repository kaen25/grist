import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Commit } from '@/domain/entities';

interface CommitItemProps {
  commit: Commit;
  isSelected: boolean;
  onSelect: () => void;
}

export function CommitItem({ commit, isSelected, onSelect }: CommitItemProps) {
  const timeAgo = formatDistanceToNow(new Date(commit.date), { addSuffix: true });

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full h-full text-left px-3 py-2 border-b hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">
              {commit.short_hash}
            </span>
            {commit.refs.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {commit.refs.slice(0, 2).map((ref) => (
                  <Badge key={ref} variant="secondary" className="text-xs py-0">
                    {ref.replace('HEAD -> ', '')}
                  </Badge>
                ))}
                {commit.refs.length > 2 && (
                  <Badge variant="outline" className="text-xs py-0">
                    +{commit.refs.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="font-medium truncate text-sm">{commit.subject}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {commit.author_name} &bull; {timeAgo}
          </div>
        </div>
      </div>
    </button>
  );
}
