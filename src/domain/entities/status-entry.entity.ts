import type { FileStatus } from '@/domain/value-objects/file-status.vo';

export interface StatusEntry {
  path: string;
  index_status: FileStatus;
  worktree_status: FileStatus;
  original_path: string | null;
  /** True if the only changes are line ending differences (CRLF/LF) */
  only_eol_changes?: boolean;
}
