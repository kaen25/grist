import type { FileStatus } from './file-status.vo';
import type { DiffHunk } from './diff-hunk.vo';

export interface FileDiff {
  old_path: string | null;
  new_path: string;
  status: FileStatus;
  hunks: DiffHunk[];
  is_binary: boolean;
  additions: number;
  deletions: number;
}
