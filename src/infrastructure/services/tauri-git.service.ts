import { invoke } from '@tauri-apps/api/core';
import type { IGitRepository, RemoteAuthConfig, SshKeyInfo } from '@/domain/interfaces';
import type { Repository, Branch, Commit, Remote, Stash, Tag } from '@/domain/entities';
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

  async deleteRemoteBranch(repoPath: string, remote: string, branchName: string): Promise<void> {
    return invoke('delete_remote_branch', { repoPath, remote, branchName });
  },

  // Merge & Rebase
  async mergeBranch(repoPath: string, name: string, noFf = false): Promise<void> {
    return invoke('merge_branch', { repoPath, name, noFf });
  },

  async rebaseBranch(repoPath: string, onto: string): Promise<void> {
    return invoke('rebase_branch', { repoPath, onto });
  },

  async abortMerge(repoPath: string): Promise<void> {
    return invoke('abort_merge', { repoPath });
  },

  async abortRebase(repoPath: string): Promise<void> {
    return invoke('abort_rebase', { repoPath });
  },

  async continueRebase(repoPath: string): Promise<void> {
    return invoke('continue_rebase', { repoPath });
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

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    return invoke('add_remote', { repoPath, name, url });
  },

  async removeRemote(repoPath: string, name: string): Promise<void> {
    return invoke('remove_remote', { repoPath, name });
  },

  async fetch(repoPath: string, remote?: string, prune = false, sshKeyPath?: string): Promise<void> {
    return invoke('fetch_remote', { repoPath, remote, prune, sshKeyPath });
  },

  async pull(repoPath: string, remote?: string, branch?: string, rebase = false, sshKeyPath?: string): Promise<void> {
    return invoke('pull_remote', { repoPath, remote, branch, rebase, sshKeyPath });
  },

  async push(repoPath: string, remote?: string, branch?: string, force = false, setUpstream = false, sshKeyPath?: string): Promise<void> {
    return invoke('push_remote', { repoPath, remote, branch, force, setUpstream, sshKeyPath });
  },

  async testRemoteConnection(repoPath: string, remote: string, sshKeyPath?: string): Promise<void> {
    return invoke('test_remote_connection', { repoPath, remote, sshKeyPath });
  },

  // Remote Auth Config
  async getRemoteAuthConfig(repoPath: string, remoteName: string): Promise<RemoteAuthConfig> {
    return invoke('get_remote_auth_config', { repoPath, remoteName });
  },

  async setRemoteAuthConfig(repoPath: string, remoteName: string, config: RemoteAuthConfig): Promise<void> {
    return invoke('set_remote_auth_config', { repoPath, remoteName, config });
  },

  async removeRemoteAuthConfig(repoPath: string, remoteName: string): Promise<void> {
    return invoke('remove_remote_auth_config', { repoPath, remoteName });
  },

  // SSH Key Conversion
  async checkSshKey(path: string): Promise<SshKeyInfo> {
    return invoke('check_ssh_key', { path });
  },

  async convertSshKey(sourcePath: string, passphrase?: string): Promise<string> {
    return invoke('convert_ssh_key', { sourcePath, passphrase });
  },

  async getConvertedKeyPath(sourcePath: string): Promise<string | null> {
    return invoke('get_converted_key_path_cmd', { sourcePath });
  },

  // SSH Key Session Management
  async sshKeyNeedsUnlock(keyPath: string): Promise<boolean> {
    return invoke('ssh_key_needs_unlock', { keyPath });
  },

  async sshKeyIsUnlocked(keyPath: string): Promise<boolean> {
    return invoke('ssh_key_is_unlocked', { keyPath });
  },

  async sshKeyUnlock(keyPath: string, passphrase: string): Promise<void> {
    return invoke('ssh_key_unlock', { keyPath, passphrase });
  },

  async sshKeyLock(keyPath: string): Promise<void> {
    return invoke('ssh_key_lock', { keyPath });
  },

  async sshKeysLockAll(): Promise<void> {
    return invoke('ssh_keys_lock_all');
  },

  async getStashes(repoPath: string): Promise<Stash[]> {
    return invoke('get_stashes', { repoPath });
  },

  async createStash(repoPath: string, message?: string, includeUntracked = false): Promise<void> {
    return invoke('create_stash', { repoPath, message, includeUntracked });
  },

  async applyStash(repoPath: string, index: number): Promise<void> {
    return invoke('apply_stash', { repoPath, index });
  },

  async popStash(repoPath: string, index: number): Promise<void> {
    return invoke('pop_stash', { repoPath, index });
  },

  async dropStash(repoPath: string, index: number): Promise<void> {
    return invoke('drop_stash', { repoPath, index });
  },

  async clearStashes(repoPath: string): Promise<void> {
    return invoke('clear_stashes', { repoPath });
  },

  async getTags(repoPath: string): Promise<Tag[]> {
    return invoke('get_tags', { repoPath });
  },

  async createTag(repoPath: string, name: string, commit?: string, message?: string): Promise<void> {
    return invoke('create_tag', { repoPath, name, commit, message });
  },

  async deleteTag(repoPath: string, name: string): Promise<void> {
    return invoke('delete_tag', { repoPath, name });
  },

  async deleteRemoteTag(repoPath: string, remote: string, name: string): Promise<void> {
    return invoke('delete_remote_tag', { repoPath, remote, name });
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

  async getStashDiff(repoPath: string, index: number): Promise<FileDiff[]> {
    return invoke('get_stash_diff', { repoPath, index });
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
