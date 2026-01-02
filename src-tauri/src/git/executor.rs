use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::io::Write;
use crate::git::error::GitError;
use crate::git::path::find_git_executable;

pub struct GitExecutor {
    git_path: String,
    repo_path: String,
}

/// Build the SSH command for a specific key path
pub fn build_ssh_command(key_path: &str) -> String {
    // -o IdentitiesOnly=yes ensures only the specified key is used
    // -o BatchMode=yes prevents password prompts (will fail if key needs passphrase)
    // -o StrictHostKeyChecking=accept-new auto-accepts new host keys
    if cfg!(windows) {
        format!(
            "ssh -i \"{}\" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new",
            key_path
        )
    } else {
        format!(
            "ssh -i '{}' -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new",
            key_path
        )
    }
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

    /// Execute a git command and return raw bytes (for binary data)
    pub fn execute_raw(&self, args: &[&str]) -> Result<Vec<u8>, GitError> {
        let output = Command::new(&self.git_path)
            .current_dir(&self.repo_path)
            .args(args)
            .output()
            .map_err(|e| GitError::IoError {
                message: e.to_string(),
            })?;

        if !output.status.success() {
            return Err(GitError::CommandFailed {
                code: output.status.code().unwrap_or(-1),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            });
        }

        Ok(output.stdout)
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

    /// Execute a git command with custom environment variables
    pub fn execute_with_env(
        &self,
        args: &[&str],
        env_vars: &HashMap<String, String>,
    ) -> Result<CommandResult, GitError> {
        let mut cmd = Command::new(&self.git_path);
        cmd.current_dir(&self.repo_path).args(args);

        for (key, value) in env_vars {
            cmd.env(key, value);
        }

        let output = cmd.output().map_err(|e| GitError::IoError {
            message: e.to_string(),
        })?;

        let result = CommandResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        };

        Ok(result)
    }

    /// Execute a git command with custom environment variables (checked version)
    pub fn execute_with_env_checked(
        &self,
        args: &[&str],
        env_vars: &HashMap<String, String>,
    ) -> Result<String, GitError> {
        let result = self.execute_with_env(args, env_vars)?;

        if result.exit_code != 0 {
            return Err(GitError::CommandFailed {
                code: result.exit_code,
                stderr: result.stderr,
            });
        }

        Ok(result.stdout)
    }
}
