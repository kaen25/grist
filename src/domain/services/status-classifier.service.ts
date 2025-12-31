import type { FileStatus } from '@/domain/value-objects';

export const StatusClassifier = {
  getIcon(status: FileStatus): string {
    if (status === 'Added' || status === 'Untracked') return 'FilePlus';
    if (status === 'Deleted') return 'FileMinus';
    if (status === 'Modified') return 'FileText';
    if (status === 'Conflicted') return 'FileQuestion';
    return 'File';
  },

  getColor(status: FileStatus): string {
    if (status === 'Added' || status === 'Untracked') return 'text-green-500';
    if (status === 'Deleted') return 'text-red-500';
    if (status === 'Modified') return 'text-yellow-500';
    if (status === 'Conflicted') return 'text-orange-500';
    return 'text-muted-foreground';
  },

  getLabel(status: FileStatus): string {
    if (typeof status === 'object') {
      if ('Renamed' in status) return 'R';
      if ('Copied' in status) return 'C';
    }
    const labels: Record<string, string> = {
      Modified: 'M',
      Added: 'A',
      Deleted: 'D',
      Untracked: '?',
      Conflicted: '!',
      Unmodified: ' ',
      TypeChanged: 'T',
      Ignored: '!',
    };
    return labels[status as string] ?? '';
  },
};
