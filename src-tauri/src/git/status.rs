use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::*;

pub fn get_status(executor: &GitExecutor) -> Result<GitStatus, GitError> {
    // Use --untracked-files=all to show individual files instead of directories
    let output = executor.execute_checked(&["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"])?;
    let mut status = parse_status_v2(&output)?;

    // Check for EOL-only changes in modified files
    detect_eol_only_changes(executor, &mut status);

    Ok(status)
}

/// Check if modified files have only line ending changes
fn detect_eol_only_changes(executor: &GitExecutor, status: &mut GitStatus) {
    // Check unstaged modified files
    for entry in &mut status.unstaged {
        if entry.worktree_status == FileStatus::Modified {
            entry.only_eol_changes = is_eol_only_change(executor, &entry.path, false);
        }
    }

    // Check staged modified files
    for entry in &mut status.staged {
        if entry.index_status == FileStatus::Modified {
            entry.only_eol_changes = is_eol_only_change(executor, &entry.path, true);
        }
    }
}

/// Check if a file's changes are only line endings by comparing diff with and without --ignore-cr-at-eol
fn is_eol_only_change(executor: &GitExecutor, path: &str, staged: bool) -> bool {
    let args_with_ignore = if staged {
        vec!["diff", "--cached", "--ignore-cr-at-eol", "--", path]
    } else {
        vec!["diff", "--ignore-cr-at-eol", "--", path]
    };

    // If diff with --ignore-cr-at-eol is empty, it means only EOL changes
    match executor.execute_checked(&args_with_ignore) {
        Ok(output) => output.trim().is_empty(),
        Err(_) => false,
    }
}

fn parse_status_v2(output: &str) -> Result<GitStatus, GitError> {
    let mut status = GitStatus {
        branch: None,
        upstream: None,
        ahead: 0,
        behind: 0,
        staged: Vec::new(),
        unstaged: Vec::new(),
        untracked: Vec::new(),
        conflicted: Vec::new(),
    };

    // Split by null bytes - for rename entries (type 2), the original path
    // comes as the next entry after the main entry
    let entries: Vec<&str> = output.split('\0').filter(|s| !s.is_empty()).collect();
    let mut i = 0;

    while i < entries.len() {
        let entry = entries[i];

        if entry.starts_with("# branch.head ") {
            let branch = entry[14..].to_string();
            status.branch = if branch == "(detached)" { None } else { Some(branch) };
        } else if entry.starts_with("# branch.upstream ") {
            status.upstream = Some(entry[18..].to_string());
        } else if entry.starts_with("# branch.ab ") {
            let parts: Vec<&str> = entry[12..].split_whitespace().collect();
            if parts.len() >= 2 {
                status.ahead = parts[0].trim_start_matches('+').parse().unwrap_or(0);
                status.behind = parts[1].trim_start_matches('-').parse().unwrap_or(0);
            }
        } else if entry.starts_with("1 ") {
            parse_changed_entry(entry, None, &mut status)?;
        } else if entry.starts_with("2 ") {
            // Type 2 = rename/copy - next entry is the original path
            let orig_path = if i + 1 < entries.len() {
                i += 1;
                Some(entries[i].to_string())
            } else {
                None
            };
            parse_changed_entry(entry, orig_path, &mut status)?;
        } else if entry.starts_with("u ") {
            parse_unmerged_entry(entry, &mut status)?;
        } else if entry.starts_with("? ") {
            status.untracked.push(StatusEntry {
                path: entry[2..].to_string(),
                index_status: FileStatus::Untracked,
                worktree_status: FileStatus::Untracked,
                original_path: None,
                only_eol_changes: false,
            });
        }

        i += 1;
    }

    Ok(status)
}

fn parse_file_status(c: char) -> FileStatus {
    match c {
        'M' => FileStatus::Modified,
        'T' => FileStatus::TypeChanged,
        'A' => FileStatus::Added,
        'D' => FileStatus::Deleted,
        'R' => FileStatus::Renamed { from: String::new() },
        'C' => FileStatus::Copied { from: String::new() },
        'U' => FileStatus::Conflicted,
        '?' => FileStatus::Untracked,
        '!' => FileStatus::Ignored,
        _ => FileStatus::Unmodified,
    }
}

fn parse_changed_entry(entry: &str, original_path: Option<String>, status: &mut GitStatus) -> Result<(), GitError> {
    let parts: Vec<&str> = entry.split(' ').collect();
    if parts.len() < 9 {
        return Ok(());
    }

    let is_rename = entry.starts_with("2 ");
    let xy = parts[1];

    // For type 2 (rename/copy), the path starts at index 9 (after the score field)
    // For type 1, the path starts at index 8
    let path = if is_rename && parts.len() >= 10 {
        parts[9..].join(" ")
    } else {
        parts[8..].join(" ")
    };

    let index_char = xy.chars().next().unwrap_or('.');
    let worktree_char = xy.chars().nth(1).unwrap_or('.');

    let mut index_status = parse_file_status(index_char);
    let mut worktree_status = parse_file_status(worktree_char);

    // For renames, update the status with the original path
    if let Some(ref orig) = original_path {
        if let FileStatus::Renamed { ref mut from } = index_status {
            *from = orig.clone();
        }
        if let FileStatus::Renamed { ref mut from } = worktree_status {
            *from = orig.clone();
        }
    }

    // Add to staged if index has changes
    if index_char != '.' {
        status.staged.push(StatusEntry {
            path: path.clone(),
            index_status: index_status.clone(),
            worktree_status: FileStatus::Unmodified,
            original_path: original_path.clone(),
            only_eol_changes: false, // Will be set later by detect_eol_only_changes
        });
    }

    // Add to unstaged if worktree has changes
    if worktree_char != '.' {
        status.unstaged.push(StatusEntry {
            path: path.clone(),
            index_status: FileStatus::Unmodified,
            worktree_status: worktree_status.clone(),
            original_path: original_path.clone(),
            only_eol_changes: false, // Will be set later by detect_eol_only_changes
        });
    }

    Ok(())
}

fn parse_unmerged_entry(entry: &str, status: &mut GitStatus) -> Result<(), GitError> {
    let parts: Vec<&str> = entry.split(' ').collect();
    if parts.len() < 11 {
        return Ok(());
    }

    let path = parts[10..].join(" ");

    status.conflicted.push(StatusEntry {
        path,
        index_status: FileStatus::Conflicted,
        worktree_status: FileStatus::Conflicted,
        original_path: None,
        only_eol_changes: false,
    });

    Ok(())
}
