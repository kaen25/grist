use std::collections::HashMap;
use crate::git::{diff, executor::GitExecutor, types::FileDiff};

#[tauri::command]
pub async fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> Result<FileDiff, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::get_file_diff(&executor, &file_path, staged).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_commit_diff(repo_path: String, hash: String) -> Result<Vec<FileDiff>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::get_commit_diff(&executor, &hash).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stage_lines(
    repo_path: String,
    file_path: String,
    line_indices_by_hunk: HashMap<usize, Vec<usize>>,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::stage_lines(&executor, &file_path, line_indices_by_hunk).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unstage_lines(
    repo_path: String,
    file_path: String,
    line_indices_by_hunk: HashMap<usize, Vec<usize>>,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::unstage_lines(&executor, &file_path, line_indices_by_hunk).map_err(|e| e.to_string())
}
