use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::*;

pub fn get_status(executor: &GitExecutor) -> Result<GitStatus, GitError> {
    let output = executor.execute_checked(&["status", "--porcelain=v2", "--branch", "-z"])?;
    parse_status_v2(&output)
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

    for entry in output.split('\0').filter(|s| !s.is_empty()) {
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
        } else if entry.starts_with("1 ") || entry.starts_with("2 ") {
            parse_changed_entry(entry, &mut status)?;
        } else if entry.starts_with("u ") {
            parse_unmerged_entry(entry, &mut status)?;
        } else if entry.starts_with("? ") {
            status.untracked.push(StatusEntry {
                path: entry[2..].to_string(),
                index_status: FileStatus::Untracked,
                worktree_status: FileStatus::Untracked,
                original_path: None,
            });
        }
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

fn parse_changed_entry(entry: &str, status: &mut GitStatus) -> Result<(), GitError> {
    let parts: Vec<&str> = entry.split(' ').collect();
    if parts.len() < 9 {
        return Ok(());
    }

    let xy = parts[1];
    let path = parts[8..].join(" ");

    let index_char = xy.chars().next().unwrap_or('.');
    let worktree_char = xy.chars().nth(1).unwrap_or('.');

    let index_status = parse_file_status(index_char);
    let worktree_status = parse_file_status(worktree_char);

    // Add to staged if index has changes
    if index_char != '.' {
        status.staged.push(StatusEntry {
            path: path.clone(),
            index_status: index_status.clone(),
            worktree_status: FileStatus::Unmodified,
            original_path: None,
        });
    }

    // Add to unstaged if worktree has changes
    if worktree_char != '.' {
        status.unstaged.push(StatusEntry {
            path: path.clone(),
            index_status: FileStatus::Unmodified,
            worktree_status: worktree_status.clone(),
            original_path: None,
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
    });

    Ok(())
}
