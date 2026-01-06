use std::process::Command;
use crate::git::error::GitError;

#[cfg(target_os = "windows")]
const GIT_PATHS: &[&str] = &[
    "git",
    "C:\\Program Files\\Git\\bin\\git.exe",
    "C:\\Program Files (x86)\\Git\\bin\\git.exe",
];

#[cfg(not(target_os = "windows"))]
const GIT_PATHS: &[&str] = &[
    "git",
    "/usr/bin/git",
    "/usr/local/bin/git",
    "/opt/homebrew/bin/git",
];

pub fn find_git_executable() -> Result<String, GitError> {
    // First try the PATH
    if let Ok(output) = Command::new("git").arg("--version").output() {
        if output.status.success() {
            return Ok("git".to_string());
        }
    }

    // Try known locations
    for path in GIT_PATHS {
        if let Ok(output) = Command::new(path).arg("--version").output() {
            if output.status.success() {
                return Ok(path.to_string());
            }
        }
    }

    Err(GitError::GitNotFound)
}

pub fn get_git_version() -> Result<String, GitError> {
    let git_path = find_git_executable()?;
    let output = Command::new(&git_path)
        .arg("--version")
        .output()
        .map_err(|e| GitError::IoError {
            message: e.to_string(),
        })?;

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub fn get_git_path() -> Result<String, GitError> {
    find_git_executable()
}
