use crate::git::{commit, executor::GitExecutor};

#[tauri::command]
pub async fn create_commit(
    repo_path: String,
    message: String,
    amend: bool,
) -> Result<String, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::create_commit(&executor, &message, amend).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_last_commit_message(repo_path: String) -> Result<String, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::get_last_commit_message(&executor).map_err(|e| e.to_string())
}
