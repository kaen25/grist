import { invoke } from '@tauri-apps/api/core';
import type { IGitRepository } from '@/domain/interfaces';
import type { Repository, Branch, Commit, Remote, Stash } from '@/domain/entities';
import type { GitStatus, FileDiff } from '@/domain/value-objects';

/**
 * Tauri IPC implementation of IGitRepository
 * All methods use Tauri's invoke() to call Rust commands
 */
export const tauriGitService: IGitRepository = {
  async getVersion(): Promise<string> {
    return invoke('get_git_version');
  },

  async getRepositoryInfo(path: string): Promise<Repository> {
    return invoke('get_repository_info', { path });
  },

  async openRepository(path: string): Promise<Repository> {
    return invoke('open_repository', { path });
  },

  async isGitRepository(path: string): Promise<boolean> {
    return invoke('is_git_repository', { path });
  },

  // These commands will be implemented in later phases
  async getStatus(repoPath: string): Promise<GitStatus> {
    return invoke('get_git_status', { repoPath });
  },

  async getBranches(repoPath: string): Promise<Branch[]> {
    return invoke('get_branches', { repoPath });
  },

  async createBranch(repoPath: string, name: string, startPoint?: string): Promise<void> {
    return invoke('create_branch', { repoPath, name, startPoint });
  },

  async deleteBranch(repoPath: string, name: string, force = false): Promise<void> {
    return invoke('delete_branch', { repoPath, name, force });
  },

  async checkoutBranch(repoPath: string, name: string): Promise<void> {
    return invoke('checkout_branch', { repoPath, name });
  },

  async renameBranch(repoPath: string, oldName: string, newName: string): Promise<void> {
    return invoke('rename_branch', { repoPath, oldName, newName });
  },

  async getCommits(repoPath: string, limit = 100): Promise<Commit[]> {
    return invoke('get_commit_log', { repoPath, count: limit, skip: 0 });
  },

  async getCommitLog(repoPath: string, count: number, skip: number): Promise<Commit[]> {
    return invoke('get_commit_log', { repoPath, count, skip });
  },

  async getRemotes(repoPath: string): Promise<Remote[]> {
    return invoke('get_remotes', { repoPath });
  },

  async getStashes(repoPath: string): Promise<Stash[]> {
    return invoke('get_stashes', { repoPath });
  },

  async getFileDiff(repoPath: string, filePath: string, staged: boolean, ignoreCr = true): Promise<FileDiff> {
    return invoke('get_file_diff', { repoPath, filePath, staged, ignoreCr });
  },

  async getUntrackedFileDiff(repoPath: string, filePath: string): Promise<FileDiff> {
    return invoke('get_untracked_file_diff', { repoPath, filePath });
  },

  async getCommitDiff(repoPath: string, hash: string): Promise<FileDiff[]> {
    return invoke('get_commit_diff', { repoPath, hash });
  },

  // Staging operations
  async stageFile(repoPath: string, filePath: string): Promise<void> {
    return invoke('stage_file', { repoPath, filePath });
  },

  async stageAll(repoPath: string): Promise<void> {
    return invoke('stage_all', { repoPath });
  },

  async unstageFile(repoPath: string, filePath: string): Promise<void> {
    return invoke('unstage_file', { repoPath, filePath });
  },

  async unstageAll(repoPath: string): Promise<void> {
    return invoke('unstage_all', { repoPath });
  },

  async discardChanges(repoPath: string, filePath: string, isUntracked: boolean): Promise<void> {
    return invoke('discard_changes', { repoPath, filePath, isUntracked });
  },

  async stageLines(repoPath: string, filePath: string, lineIndicesByHunk: Record<number, number[]>): Promise<void> {
    return invoke('stage_lines', { repoPath, filePath, lineIndicesByHunk });
  },

  async unstageLines(repoPath: string, filePath: string, lineIndicesByHunk: Record<number, number[]>): Promise<void> {
    return invoke('unstage_lines', { repoPath, filePath, lineIndicesByHunk });
  },

  // Commit
  async createCommit(repoPath: string, message: string, amend: boolean): Promise<string> {
    return invoke('create_commit', { repoPath, message, amend });
  },

  async getLastCommitMessage(repoPath: string): Promise<string> {
    return invoke('get_last_commit_message', { repoPath });
  },
};
