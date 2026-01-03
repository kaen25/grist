import { useRepositoryStore } from '@/application/stores';
import { useUIStore } from '@/application/stores/ui.store';
import { ButtonCopy } from '@/components/atom/button-copy';
import { cn } from '@/lib/utils';

interface CommitHashLinkProps {
  hash: string;
  shortHash?: string;
  className?: string;
  isCopyable?: boolean;
}

export function CommitHashLink({ hash, shortHash, className, isCopyable = false }: CommitHashLinkProps) {
  const { commits } = useRepositoryStore();
  const { setSelectedCommit } = useUIStore();

  const displayHash = shortHash || hash.substring(0, 8);
  const commitExists = commits.some((c) => c.hash === hash);

  const handleClick = () => {
    if (commitExists) {
      setSelectedCommit(hash);
    }
  };

  if (!commitExists) {
    return (
      <code className={cn('font-mono text-xs bg-muted px-1.5 py-0.5 rounded', className)}>
        {displayHash}
      </code>
    );
  }

  return (<>
    {isCopyable ? <ButtonCopy textToCopy={hash} /> : null}
    <button
      onClick={handleClick}
      className={cn(
        'font-mono text-xs bg-muted px-1.5 py-0.5 rounded',
        'hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors',
        className
      )}
      title={`Go to commit ${hash}`}
    >
      {displayHash}
    </button>
    </>
  );
}
