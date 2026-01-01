use std::collections::HashMap;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use crate::git::{diff, executor::GitExecutor, types::FileDiff};

#[tauri::command]
pub async fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
    ignore_cr: Option<bool>,
) -> Result<FileDiff, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::get_file_diff(&executor, &file_path, staged, ignore_cr.unwrap_or(true)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_commit_diff(repo_path: String, hash: String) -> Result<Vec<FileDiff>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::get_commit_diff(&executor, &hash).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_untracked_file_diff(repo_path: String, file_path: String) -> Result<FileDiff, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::get_untracked_file_diff(&executor, &file_path).map_err(|e| e.to_string())
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

#[tauri::command]
pub async fn get_blob_base64(
    repo_path: String,
    commit_hash: String,
    file_path: String,
) -> Result<String, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;

    // Use git show to get the blob content (raw bytes for binary files)
    let bytes = executor.execute_raw(&[
        "show",
        &format!("{}:{}", commit_hash, file_path),
    ]).map_err(|e| e.to_string())?;

    // Return base64 encoded content
    Ok(BASE64.encode(&bytes))
}
