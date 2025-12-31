import type { FileStatus } from '@/domain/value-objects/file-status.vo';

export interface StatusEntry {
  path: string;
  index_status: FileStatus;
  worktree_status: FileStatus;
  original_path: string | null;
}
