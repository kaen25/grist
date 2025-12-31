use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::*;

pub fn get_file_diff(
    executor: &GitExecutor,
    path: &str,
    staged: bool,
) -> Result<FileDiff, GitError> {
    let args = if staged {
        vec!["diff", "--cached", "--", path]
    } else {
        vec!["diff", "--", path]
    };

    let output = executor.execute_checked(&args)?;
    parse_diff(&output, path)
}

pub fn get_commit_diff(executor: &GitExecutor, hash: &str) -> Result<Vec<FileDiff>, GitError> {
    let output = executor.execute_checked(&["show", "--format=", hash])?;
    parse_multi_diff(&output)
}

fn parse_diff(output: &str, default_path: &str) -> Result<FileDiff, GitError> {
    let mut diff = FileDiff {
        old_path: None,
        new_path: default_path.to_string(),
        status: FileStatus::Modified,
        hunks: Vec::new(),
        is_binary: false,
        additions: 0,
        deletions: 0,
    };

    let mut current_hunk: Option<DiffHunk> = None;
    let mut old_line = 0u32;
    let mut new_line = 0u32;

    for line in output.lines() {
        if line.starts_with("diff --git") {
            // Parse file paths
            if let Some(paths) = parse_diff_header(line) {
                diff.old_path = Some(paths.0);
                diff.new_path = paths.1;
            }
        } else if line.starts_with("Binary files") {
            diff.is_binary = true;
        } else if line.starts_with("@@") {
            // Save previous hunk
            if let Some(hunk) = current_hunk.take() {
                diff.hunks.push(hunk);
            }

            // Parse hunk header
            if let Some((old_start, old_lines, new_start, new_lines)) = parse_hunk_header(line) {
                current_hunk = Some(DiffHunk {
                    old_start,
                    old_lines,
                    new_start,
                    new_lines,
                    header: line.to_string(),
                    lines: Vec::new(),
                });
                old_line = old_start;
                new_line = new_start;
            }
        } else if let Some(ref mut hunk) = current_hunk {
            let (line_type, content) = if line.starts_with('+') {
                diff.additions += 1;
                (DiffLineType::Addition, &line[1..])
            } else if line.starts_with('-') {
                diff.deletions += 1;
                (DiffLineType::Deletion, &line[1..])
            } else if line.starts_with(' ') {
                (DiffLineType::Context, &line[1..])
            } else {
                continue;
            };

            let diff_line = match line_type {
                DiffLineType::Addition => {
                    let l = DiffLine {
                        line_type,
                        old_line_number: None,
                        new_line_number: Some(new_line),
                        content: content.to_string(),
                    };
                    new_line += 1;
                    l
                }
                DiffLineType::Deletion => {
                    let l = DiffLine {
                        line_type,
                        old_line_number: Some(old_line),
                        new_line_number: None,
                        content: content.to_string(),
                    };
                    old_line += 1;
                    l
                }
                DiffLineType::Context => {
                    let l = DiffLine {
                        line_type,
                        old_line_number: Some(old_line),
                        new_line_number: Some(new_line),
                        content: content.to_string(),
                    };
                    old_line += 1;
                    new_line += 1;
                    l
                }
                _ => continue,
            };

            hunk.lines.push(diff_line);
        }
    }

    // Save last hunk
    if let Some(hunk) = current_hunk {
        diff.hunks.push(hunk);
    }

    Ok(diff)
}

fn parse_multi_diff(output: &str) -> Result<Vec<FileDiff>, GitError> {
    let mut diffs = Vec::new();
    let mut current_diff = String::new();
    let mut current_path = String::new();

    for line in output.lines() {
        if line.starts_with("diff --git") {
            if !current_diff.is_empty() {
                diffs.push(parse_diff(&current_diff, &current_path)?);
            }
            current_diff = line.to_string() + "\n";
            if let Some(paths) = parse_diff_header(line) {
                current_path = paths.1;
            }
        } else {
            current_diff.push_str(line);
            current_diff.push('\n');
        }
    }

    if !current_diff.is_empty() {
        diffs.push(parse_diff(&current_diff, &current_path)?);
    }

    Ok(diffs)
}

fn parse_diff_header(line: &str) -> Option<(String, String)> {
    // "diff --git a/path b/path"
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() >= 4 {
        let a = parts[2].strip_prefix("a/").unwrap_or(parts[2]);
        let b = parts[3].strip_prefix("b/").unwrap_or(parts[3]);
        return Some((a.to_string(), b.to_string()));
    }
    None
}

fn parse_hunk_header(line: &str) -> Option<(u32, u32, u32, u32)> {
    // "@@ -old_start,old_lines +new_start,new_lines @@"
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() >= 3 {
        let old = parts[1].trim_start_matches('-');
        let new = parts[2].trim_start_matches('+');

        let (old_start, old_lines) = parse_range(old);
        let (new_start, new_lines) = parse_range(new);

        return Some((old_start, old_lines, new_start, new_lines));
    }
    None
}

fn parse_range(range: &str) -> (u32, u32) {
    let parts: Vec<&str> = range.split(',').collect();
    let start = parts[0].parse().unwrap_or(1);
    let lines = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1);
    (start, lines)
}
