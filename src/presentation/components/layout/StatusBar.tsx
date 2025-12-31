import { useRepositoryStore } from '@/application/stores';

export function StatusBar() {
  const { currentRepo, status } = useRepositoryStore();

  const getStatusText = () => {
    if (!currentRepo) return 'No repository open';
    if (!status) return 'Loading...';

    const changes =
      status.staged.length + status.unstaged.length + status.untracked.length;
    if (changes === 0) return 'Working tree clean';

    const parts = [];
    if (status.staged.length > 0) parts.push(`${status.staged.length} staged`);
    if (status.unstaged.length > 0) parts.push(`${status.unstaged.length} modified`);
    if (status.untracked.length > 0) parts.push(`${status.untracked.length} untracked`);

    return parts.join(', ');
  };

  return (
    <footer className="flex h-6 items-center justify-between border-t bg-muted/40 px-4 text-xs text-muted-foreground">
      <span>{currentRepo?.path ?? ''}</span>
      <span>{getStatusText()}</span>
    </footer>
  );
}
