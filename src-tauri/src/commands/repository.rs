use crate::git::{error::GitError, executor::GitExecutor, path, types::Repository};
use std::path::Path;

#[tauri::command]
pub fn get_git_version() -> Result<String, String> {
    path::get_git_version().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_repository_info(path: String) -> Result<Repository, String> {
    let repo_path = Path::new(&path);

    if !repo_path.join(".git").exists() {
        return Err(GitError::NotARepository { path: path.clone() }.to_string());
    }

    let name = repo_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    // Get current branch
    let branch = match GitExecutor::new(&path) {
        Ok(executor) => {
            match executor.execute_checked(&["rev-parse", "--abbrev-ref", "HEAD"]) {
                Ok(output) => Some(output.trim().to_string()),
                Err(_) => None,
            }
        }
        Err(_) => None,
    };

    // Get remote URL
    let remote_url = match GitExecutor::new(&path) {
        Ok(executor) => {
            match executor.execute_checked(&["remote", "get-url", "origin"]) {
                Ok(output) => Some(output.trim().to_string()),
                Err(_) => None,
            }
        }
        Err(_) => None,
    };

    Ok(Repository {
        path,
        name,
        branch,
        remote_url,
    })
}

#[tauri::command]
pub fn is_git_repository(path: String) -> bool {
    Path::new(&path).join(".git").exists()
}
