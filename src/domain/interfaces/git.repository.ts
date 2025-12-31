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

  // Remotes
  getRemotes(repoPath: string): Promise<Remote[]>;

  // Stash
  getStashes(repoPath: string): Promise<Stash[]>;

  // Diff
  getFileDiff(repoPath: string, filePath: string, staged: boolean): Promise<FileDiff>;
}
