use crate::git::error::GitError;
use crate::git::executor::{GitExecutor, build_ssh_command};
use crate::git::types::Remote;
use std::collections::HashMap;

/// Build environment variables for SSH authentication
fn build_auth_env(ssh_key_path: Option<&str>) -> HashMap<String, String> {
    let mut env = HashMap::new();
    if let Some(key_path) = ssh_key_path {
        env.insert("GIT_SSH_COMMAND".to_string(), build_ssh_command(key_path));
    }
    env
}

pub fn get_remotes(executor: &GitExecutor) -> Result<Vec<Remote>, GitError> {
    let output = executor.execute_checked(&["remote", "-v"])?;
    parse_remotes(&output)
}

fn parse_remotes(output: &str) -> Result<Vec<Remote>, GitError> {
    let mut remotes: HashMap<String, Remote> = HashMap::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let name = parts[0].to_string();
        let url = parts[1].to_string();
        let kind = parts[2]; // (fetch) or (push)

        let remote = remotes.entry(name.clone()).or_insert(Remote {
            name: name.clone(),
            fetch_url: String::new(),
            push_url: String::new(),
        });

        if kind == "(fetch)" {
            remote.fetch_url = url;
        } else if kind == "(push)" {
            remote.push_url = url;
        }
    }

    Ok(remotes.into_values().collect())
}

pub fn add_remote(executor: &GitExecutor, name: &str, url: &str) -> Result<(), GitError> {
    executor.execute_checked(&["remote", "add", name, url])?;
    Ok(())
}

pub fn remove_remote(executor: &GitExecutor, name: &str) -> Result<(), GitError> {
    executor.execute_checked(&["remote", "remove", name])?;
    Ok(())
}

pub fn fetch(
    executor: &GitExecutor,
    remote: Option<&str>,
    prune: bool,
    ssh_key_path: Option<&str>,
) -> Result<(), GitError> {
    let mut args = vec!["fetch"];
    if let Some(r) = remote {
        args.push(r);
    } else {
        args.push("--all");
    }
    if prune {
        args.push("--prune");
    }

    let env = build_auth_env(ssh_key_path);
    if env.is_empty() {
        executor.execute_checked(&args)?;
    } else {
        executor.execute_with_env_checked(&args, &env)?;
    }
    Ok(())
}

pub fn pull(
    executor: &GitExecutor,
    remote: Option<&str>,
    branch: Option<&str>,
    rebase: bool,
    ssh_key_path: Option<&str>,
) -> Result<(), GitError> {
    let mut args = vec!["pull"];
    if rebase {
        args.push("--rebase");
    }
    if let Some(r) = remote {
        args.push(r);
    }
    if let Some(b) = branch {
        args.push(b);
    }

    let env = build_auth_env(ssh_key_path);
    let result = if env.is_empty() {
        executor.execute(&args)?
    } else {
        executor.execute_with_env(&args, &env)?
    };

    if result.exit_code != 0 {
        if result.stderr.contains("CONFLICT") {
            return Err(GitError::MergeConflict);
        }
        return Err(GitError::CommandFailed {
            code: result.exit_code,
            stderr: result.stderr,
        });
    }
    Ok(())
}

pub fn push(
    executor: &GitExecutor,
    remote: Option<&str>,
    branch: Option<&str>,
    force: bool,
    set_upstream: bool,
    push_tags: bool,
    ssh_key_path: Option<&str>,
) -> Result<(), GitError> {
    let mut args = vec!["push"];
    if force {
        args.push("--force");
    }
    if set_upstream {
        args.push("-u");
    }
    if push_tags {
        args.push("--tags");
    }
    if let Some(r) = remote {
        args.push(r);
    }
    if let Some(b) = branch {
        args.push(b);
    }

    let env = build_auth_env(ssh_key_path);
    if env.is_empty() {
        executor.execute_checked(&args)?;
    } else {
        executor.execute_with_env_checked(&args, &env)?;
    }
    Ok(())
}

/// Test SSH connection to a remote
pub fn test_connection(
    executor: &GitExecutor,
    remote: &str,
    ssh_key_path: Option<&str>,
) -> Result<(), GitError> {
    let env = build_auth_env(ssh_key_path);
    let args = vec!["ls-remote", "--heads", remote];

    let result = if env.is_empty() {
        executor.execute(&args)?
    } else {
        executor.execute_with_env(&args, &env)?
    };

    if result.exit_code != 0 {
        return Err(GitError::CommandFailed {
            code: result.exit_code,
            stderr: result.stderr,
        });
    }
    Ok(())
}
