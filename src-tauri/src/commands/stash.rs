use crate::git::{executor::GitExecutor, stash, types::Stash};

#[tauri::command]
pub async fn get_stashes(repo_path: String) -> Result<Vec<Stash>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::get_stashes(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_stash(
    repo_path: String,
    message: Option<String>,
    include_untracked: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::create_stash(&executor, message.as_deref(), include_untracked)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn apply_stash(repo_path: String, index: u32) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::apply_stash(&executor, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pop_stash(repo_path: String, index: u32) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::pop_stash(&executor, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_stash(repo_path: String, index: u32) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::drop_stash(&executor, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_stashes(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::clear_stashes(&executor).map_err(|e| e.to_string())
}
