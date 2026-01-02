import type { Repository, Branch, Commit, Remote, Stash, Tag } from '@/domain/entities';
import type { GitStatus, FileDiff } from '@/domain/value-objects';

export type AuthType = 'ssh-agent' | 'ssh-key' | 'none';

export interface RemoteAuthConfig {
  auth_type: AuthType;
  ssh_key_path?: string;
}

export interface SshKeyInfo {
  path: string;
  format: 'ppk' | 'openssh' | 'pem' | 'unknown';
  encrypted: boolean;
  needs_conversion: boolean;
  ppk_version?: 'v2' | 'v3';
}

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
  createBranch(repoPath: string, name: string, startPoint?: string): Promise<void>;
  deleteBranch(repoPath: string, name: string, force?: boolean): Promise<void>;
  checkoutBranch(repoPath: string, name: string): Promise<void>;
  renameBranch(repoPath: string, oldName: string, newName: string): Promise<void>;
  deleteRemoteBranch(repoPath: string, remote: string, branchName: string): Promise<void>;

  // Merge & Rebase
  mergeBranch(repoPath: string, name: string, noFf?: boolean): Promise<void>;
  rebaseBranch(repoPath: string, onto: string): Promise<void>;
  abortMerge(repoPath: string): Promise<void>;
  abortRebase(repoPath: string): Promise<void>;
  continueRebase(repoPath: string): Promise<void>;

  // Remotes
  addRemote(repoPath: string, name: string, url: string): Promise<void>;
  removeRemote(repoPath: string, name: string): Promise<void>;
  fetch(repoPath: string, remote?: string, prune?: boolean, sshKeyPath?: string): Promise<void>;
  pull(repoPath: string, remote?: string, branch?: string, rebase?: boolean, sshKeyPath?: string): Promise<void>;
  push(repoPath: string, remote?: string, branch?: string, force?: boolean, setUpstream?: boolean, sshKeyPath?: string): Promise<void>;
  testRemoteConnection(repoPath: string, remote: string, sshKeyPath?: string): Promise<void>;

  // Remote Auth Config
  getRemoteAuthConfig(repoPath: string, remoteName: string): Promise<RemoteAuthConfig>;
  setRemoteAuthConfig(repoPath: string, remoteName: string, config: RemoteAuthConfig): Promise<void>;
  removeRemoteAuthConfig(repoPath: string, remoteName: string): Promise<void>;

  // SSH Key Conversion
  checkSshKey(path: string): Promise<SshKeyInfo>;
  convertSshKey(sourcePath: string, passphrase?: string): Promise<string>;
  getConvertedKeyPath(sourcePath: string): Promise<string | null>;

  // SSH Key Session Management (passphrase caching)
  sshKeyNeedsUnlock(keyPath: string): Promise<boolean>;
  sshKeyIsUnlocked(keyPath: string): Promise<boolean>;
  sshKeyUnlock(keyPath: string, passphrase: string): Promise<void>;
  sshKeyLock(keyPath: string): Promise<void>;
  sshKeysLockAll(): Promise<void>;

  // Commits
  getCommits(repoPath: string, limit?: number): Promise<Commit[]>;
  getCommitLog(repoPath: string, count: number, skip: number): Promise<Commit[]>;

  // Remotes
  getRemotes(repoPath: string): Promise<Remote[]>;

  // Stash
  getStashes(repoPath: string): Promise<Stash[]>;
  createStash(repoPath: string, message?: string, includeUntracked?: boolean): Promise<void>;
  applyStash(repoPath: string, index: number): Promise<void>;
  popStash(repoPath: string, index: number): Promise<void>;
  dropStash(repoPath: string, index: number): Promise<void>;
  clearStashes(repoPath: string): Promise<void>;

  // Tags
  getTags(repoPath: string): Promise<Tag[]>;
  createTag(repoPath: string, name: string, commit?: string, message?: string): Promise<void>;
  deleteTag(repoPath: string, name: string): Promise<void>;
  deleteRemoteTag(repoPath: string, remote: string, name: string): Promise<void>;

  // Diff
  getFileDiff(repoPath: string, filePath: string, staged: boolean, ignoreCr?: boolean): Promise<FileDiff>;
  getUntrackedFileDiff(repoPath: string, filePath: string): Promise<FileDiff>;
  getCommitDiff(repoPath: string, hash: string): Promise<FileDiff[]>;
  getStashDiff(repoPath: string, index: number): Promise<FileDiff[]>;

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
