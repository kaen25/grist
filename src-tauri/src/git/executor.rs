use std::process::{Command, Stdio};
use std::io::Write;
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

    pub fn execute_with_stdin(&self, args: &[&str], stdin_data: &str) -> Result<String, GitError> {
        let mut child = Command::new(&self.git_path)
            .current_dir(&self.repo_path)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| GitError::IoError {
                message: e.to_string(),
            })?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(stdin_data.as_bytes()).map_err(|e| GitError::IoError {
                message: e.to_string(),
            })?;
        }

        let output = child.wait_with_output().map_err(|e| GitError::IoError {
            message: e.to_string(),
        })?;

        if !output.status.success() {
            return Err(GitError::CommandFailed {
                code: output.status.code().unwrap_or(-1),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            });
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }
}
