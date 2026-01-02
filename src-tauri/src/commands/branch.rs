use crate::git::{branch, executor::GitExecutor, types::Branch};

#[tauri::command]
pub async fn get_branches(repo_path: String) -> Result<Vec<Branch>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::get_branches(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_branch(
    repo_path: String,
    name: String,
    start_point: Option<String>,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::create_branch(&executor, &name, start_point.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_branch(
    repo_path: String,
    name: String,
    force: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::delete_branch(&executor, &name, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn checkout_branch(repo_path: String, name: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::checkout_branch(&executor, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_branch(
    repo_path: String,
    old_name: String,
    new_name: String,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::rename_branch(&executor, &old_name, &new_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_remote_branch(
    repo_path: String,
    remote: String,
    branch_name: String,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::delete_remote_branch(&executor, &remote, &branch_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn merge_branch(
    repo_path: String,
    name: String,
    no_ff: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::merge_branch(&executor, &name, no_ff).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rebase_branch(repo_path: String, onto: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::rebase_branch(&executor, &onto).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn abort_merge(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::abort_merge(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn abort_rebase(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::abort_rebase(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn continue_rebase(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::continue_rebase(&executor).map_err(|e| e.to_string())
}
