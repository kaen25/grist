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

#[tauri::command]
pub async fn cherry_pick(repo_path: String, hash: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::cherry_pick(&executor, &hash).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn revert_commit(repo_path: String, hash: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::revert_commit(&executor, &hash).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn abort_cherry_pick(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::abort_cherry_pick(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn abort_revert(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::abort_revert(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn continue_cherry_pick(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::continue_cherry_pick(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn continue_revert(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::continue_revert(&executor).map_err(|e| e.to_string())
}
