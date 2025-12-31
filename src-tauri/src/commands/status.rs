use crate::git::{executor::GitExecutor, status, types::GitStatus};

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<GitStatus, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    status::get_status(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    executor
        .execute_checked(&["add", "--", &file_path])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn stage_all(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    executor
        .execute_checked(&["add", "-A"])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    executor
        .execute_checked(&["reset", "HEAD", "--", &file_path])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_all(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    executor
        .execute_checked(&["reset", "HEAD"])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn discard_changes(repo_path: String, file_path: String, is_untracked: bool) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;

    if is_untracked {
        // For untracked files, use clean
        executor
            .execute_checked(&["clean", "-f", "--", &file_path])
            .map_err(|e| e.to_string())?;
    } else {
        // For tracked files, checkout from HEAD
        executor
            .execute_checked(&["checkout", "HEAD", "--", &file_path])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
