use std::process::Command;
use crate::git::error::GitError;
use crate::git::path::find_git_executable;

pub struct GitExecutor {
    git_path: String,
    repo_path: String,
}

#[derive(Debug)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

impl GitExecutor {
    pub fn new(repo_path: &str) -> Result<Self, GitError> {
        let git_path = find_git_executable()?;
        Ok(Self {
            git_path,
            repo_path: repo_path.to_string(),
        })
    }

    pub fn execute(&self, args: &[&str]) -> Result<CommandResult, GitError> {
        let output = Command::new(&self.git_path)
            .current_dir(&self.repo_path)
            .args(args)
            .output()
            .map_err(|e| GitError::IoError {
                message: e.to_string(),
            })?;

        let result = CommandResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        };

        Ok(result)
    }

    pub fn execute_checked(&self, args: &[&str]) -> Result<String, GitError> {
        let result = self.execute(args)?;

        if result.exit_code != 0 {
            return Err(GitError::CommandFailed {
                code: result.exit_code,
                stderr: result.stderr,
            });
        }

        Ok(result.stdout)
    }

    pub fn repo_path(&self) -> &str {
        &self.repo_path
    }
}
