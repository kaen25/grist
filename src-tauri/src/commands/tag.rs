use crate::git::{tag, executor::GitExecutor, tag::Tag};

#[tauri::command]
pub async fn get_tags(repo_path: String) -> Result<Vec<Tag>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    tag::get_tags(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_tag(
    repo_path: String,
    name: String,
    commit: Option<String>,
    message: Option<String>,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    tag::create_tag(&executor, &name, commit.as_deref(), message.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_tag(repo_path: String, name: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    tag::delete_tag(&executor, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_remote_tag(
    repo_path: String,
    remote: String,
    name: String,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    tag::delete_remote_tag(&executor, &remote, &name).map_err(|e| e.to_string())
}
