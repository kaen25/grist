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
