import type { Repository, Branch, Commit, Remote, Stash } from '@/domain/entities';
import type { GitStatus, FileDiff } from '@/domain/value-objects';

export interface IGitRepository {
  // Repository
  getVersion(): Promise<string>;
  getRepositoryInfo(path: string): Promise<Repository>;
  openRepository(path: string): Promise<Repository>;
  isGitRepository(path: string): Promise<boolean>;

  // Status
  getStatus(repoPath: string): Promise<GitStatus>;

  // Branches
  getBranches(repoPath: string): Promise<Branch[]>;

  // Commits
  getCommits(repoPath: string, limit?: number): Promise<Commit[]>;
  getCommitLog(repoPath: string, count: number, skip: number): Promise<Commit[]>;

  // Remotes
  getRemotes(repoPath: string): Promise<Remote[]>;

  // Stash
  getStashes(repoPath: string): Promise<Stash[]>;

  // Diff
  getFileDiff(repoPath: string, filePath: string, staged: boolean, ignoreCr?: boolean): Promise<FileDiff>;
  getUntrackedFileDiff(repoPath: string, filePath: string): Promise<FileDiff>;
  getCommitDiff(repoPath: string, hash: string): Promise<FileDiff[]>;

  // Staging
  stageFile(repoPath: string, filePath: string): Promise<void>;
  stageAll(repoPath: string): Promise<void>;
  unstageFile(repoPath: string, filePath: string): Promise<void>;
  unstageAll(repoPath: string): Promise<void>;
  discardChanges(repoPath: string, filePath: string, isUntracked: boolean): Promise<void>;

  // Partial staging (line-level)
  stageLines(repoPath: string, filePath: string, lineIndicesByHunk: Record<number, number[]>): Promise<void>;
  unstageLines(repoPath: string, filePath: string, lineIndicesByHunk: Record<number, number[]>): Promise<void>;

  // Commit
  createCommit(repoPath: string, message: string, amend: boolean): Promise<string>;
  getLastCommitMessage(repoPath: string): Promise<string>;
}
