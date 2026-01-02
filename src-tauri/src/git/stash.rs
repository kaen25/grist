use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::Stash;

pub fn get_stashes(executor: &GitExecutor) -> Result<Vec<Stash>, GitError> {
    let output = executor.execute_checked(&[
        "stash",
        "list",
        "--format=%gd%x00%s%x00%gs%x00%ci%x00---END---",
    ])?;

    parse_stashes(&output)
}

fn parse_stashes(output: &str) -> Result<Vec<Stash>, GitError> {
    let mut stashes = Vec::new();

    for entry in output.split("---END---").filter(|s| !s.trim().is_empty()) {
        let parts: Vec<&str> = entry.trim().split('\0').collect();
        if parts.len() < 4 {
            continue;
        }

        // Parse stash@{N}
        let index_str = parts[0]
            .trim_start_matches("stash@{")
            .trim_end_matches('}');
        let index: u32 = index_str.parse().unwrap_or(0);

        // Extract branch from "WIP on branch: message" or "On branch: message"
        let gs = parts[2];
        let branch = gs
            .split(':')
            .next()
            .unwrap_or("")
            .replace("WIP on ", "")
            .replace("On ", "")
            .trim()
            .to_string();

        stashes.push(Stash {
            index,
            message: parts[1].to_string(),
            branch,
            date: parts[3].to_string(),
        });
    }

    Ok(stashes)
}

pub fn create_stash(
    executor: &GitExecutor,
    message: Option<&str>,
    include_untracked: bool,
) -> Result<(), GitError> {
    let mut args = vec!["stash", "push"];
    if include_untracked {
        args.push("--include-untracked");
    }
    if let Some(msg) = message {
        args.push("-m");
        args.push(msg);
    }
    executor.execute_checked(&args)?;
    Ok(())
}

pub fn apply_stash(executor: &GitExecutor, index: u32) -> Result<(), GitError> {
    let stash_ref = format!("stash@{{{}}}", index);
    executor.execute_checked(&["stash", "apply", &stash_ref])?;
    Ok(())
}

pub fn pop_stash(executor: &GitExecutor, index: u32) -> Result<(), GitError> {
    let stash_ref = format!("stash@{{{}}}", index);
    executor.execute_checked(&["stash", "pop", &stash_ref])?;
    Ok(())
}

pub fn drop_stash(executor: &GitExecutor, index: u32) -> Result<(), GitError> {
    let stash_ref = format!("stash@{{{}}}", index);
    executor.execute_checked(&["stash", "drop", &stash_ref])?;
    Ok(())
}

pub fn clear_stashes(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["stash", "clear"])?;
    Ok(())
}
