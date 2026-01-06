use crate::git::error::GitError;
use crate::git::executor::GitExecutor;

pub fn create_commit(
    executor: &GitExecutor,
    message: &str,
    amend: bool,
) -> Result<String, GitError> {
    let mut args = vec!["commit", "-m", message];
    if amend {
        args.push("--amend");
    }

    executor.execute_checked(&args)?;

    // Get the new commit hash
    let hash = executor.execute_checked(&["rev-parse", "HEAD"])?;
    Ok(hash.trim().to_string())
}

pub fn get_last_commit_message(executor: &GitExecutor) -> Result<String, GitError> {
    let output = executor.execute_checked(&["log", "-1", "--format=%B"])?;
    Ok(output.trim().to_string())
}

pub fn cherry_pick(executor: &GitExecutor, hash: &str) -> Result<(), GitError> {
    let result = executor.execute(&["cherry-pick", hash])?;

    if result.exit_code != 0 {
        if result.stderr.contains("CONFLICT") || result.stdout.contains("CONFLICT") {
            return Err(GitError::MergeConflict);
        }
        return Err(GitError::CommandFailed {
            code: result.exit_code,
            stderr: result.stderr,
        });
    }

    Ok(())
}

pub fn revert_commit(executor: &GitExecutor, hash: &str) -> Result<(), GitError> {
    let result = executor.execute(&["revert", "--no-edit", hash])?;

    if result.exit_code != 0 {
        if result.stderr.contains("CONFLICT") || result.stdout.contains("CONFLICT") {
            return Err(GitError::MergeConflict);
        }
        return Err(GitError::CommandFailed {
            code: result.exit_code,
            stderr: result.stderr,
        });
    }

    Ok(())
}

pub fn abort_cherry_pick(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["cherry-pick", "--abort"])?;
    Ok(())
}

pub fn abort_revert(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["revert", "--abort"])?;
    Ok(())
}

pub fn continue_cherry_pick(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["cherry-pick", "--continue"])?;
    Ok(())
}

pub fn continue_revert(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["revert", "--continue"])?;
    Ok(())
}
