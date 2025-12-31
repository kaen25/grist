use crate::git::{executor::GitExecutor, status, types::GitStatus};

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<GitStatus, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    status::get_status(&executor).map_err(|e| e.to_string())
}
