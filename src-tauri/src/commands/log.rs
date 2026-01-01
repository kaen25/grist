use crate::git::{executor::GitExecutor, log, types::Commit};

#[tauri::command]
pub async fn get_commit_log(
    repo_path: String,
    count: u32,
    skip: u32,
) -> Result<Vec<Commit>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    log::get_commit_log(&executor, count, skip).map_err(|e| e.to_string())
}
