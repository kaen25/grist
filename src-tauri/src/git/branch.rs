use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::Branch;

pub fn get_branches(executor: &GitExecutor) -> Result<Vec<Branch>, GitError> {
    let output = executor.execute_checked(&[
        "branch",
        "-a",
        "--format=%(refname:short)%00%(objectname:short)%00%(upstream:short)%00%(upstream:track)%00%(committerdate:iso8601)%00%(HEAD)",
    ])?;

    parse_branches(&output)
}

fn parse_branches(output: &str) -> Result<Vec<Branch>, GitError> {
    let mut branches = Vec::new();

    for line in output.lines().filter(|l| !l.is_empty()) {
        let parts: Vec<&str> = line.split('\0').collect();
        if parts.len() < 6 {
            continue;
        }

        let name = parts[0].to_string();
        let is_remote = name.starts_with("remotes/") || name.starts_with("origin/");
        let is_current = parts[5] == "*";

        let (remote_name, clean_name) = if is_remote {
            let clean = name.strip_prefix("remotes/").unwrap_or(&name);
            let split_parts: Vec<&str> = clean.splitn(2, '/').collect();
            if split_parts.len() == 2 {
                (Some(split_parts[0].to_string()), split_parts[1].to_string())
            } else {
                (None, clean.to_string())
            }
        } else {
            (None, name.clone())
        };

        // Parse ahead/behind from track info like "[ahead 1, behind 2]"
        let (ahead, behind) = parse_track_info(parts[3]);

        branches.push(Branch {
            name: clean_name,
            is_current,
            is_remote,
            remote_name,
            tracking: if parts[2].is_empty() { None } else { Some(parts[2].to_string()) },
            ahead,
            behind,
            last_commit_hash: if parts[1].is_empty() { None } else { Some(parts[1].to_string()) },
            last_commit_date: if parts[4].is_empty() { None } else { Some(parts[4].to_string()) },
        });
    }

    Ok(branches)
}

fn parse_track_info(track: &str) -> (u32, u32) {
    let mut ahead = 0;
    let mut behind = 0;

    if track.contains("ahead") {
        if let Some(n) = track
            .split("ahead ")
            .nth(1)
            .and_then(|s| s.split(|c: char| !c.is_numeric()).next())
            .and_then(|s| s.parse().ok())
        {
            ahead = n;
        }
    }

    if track.contains("behind") {
        if let Some(n) = track
            .split("behind ")
            .nth(1)
            .and_then(|s| s.split(|c: char| !c.is_numeric()).next())
            .and_then(|s| s.parse().ok())
        {
            behind = n;
        }
    }

    (ahead, behind)
}

pub fn create_branch(
    executor: &GitExecutor,
    name: &str,
    start_point: Option<&str>,
) -> Result<(), GitError> {
    let mut args = vec!["branch", name];
    if let Some(sp) = start_point {
        args.push(sp);
    }
    executor.execute_checked(&args)?;
    Ok(())
}

pub fn delete_branch(executor: &GitExecutor, name: &str, force: bool) -> Result<(), GitError> {
    let flag = if force { "-D" } else { "-d" };
    executor.execute_checked(&["branch", flag, name])?;
    Ok(())
}

pub fn checkout_branch(executor: &GitExecutor, name: &str) -> Result<(), GitError> {
    executor.execute_checked(&["checkout", name])?;
    Ok(())
}

pub fn rename_branch(executor: &GitExecutor, old_name: &str, new_name: &str) -> Result<(), GitError> {
    executor.execute_checked(&["branch", "-m", old_name, new_name])?;
    Ok(())
}

pub fn delete_remote_branch(executor: &GitExecutor, remote: &str, branch: &str) -> Result<(), GitError> {
    executor.execute_checked(&["push", remote, "--delete", branch])?;
    Ok(())
}
