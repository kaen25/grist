use std::path::PathBuf;
use crate::git::{executor::GitExecutor, remote, types::Remote};
use crate::keys::{needs_unlock, get_decrypted_key_path};

/// Error type that the frontend can distinguish for key unlock prompts
const KEY_LOCKED_ERROR: &str = "SSH_KEY_LOCKED:";

/// Resolve the SSH key path, decrypting if needed
/// Returns None if no key specified, Some(path) otherwise
/// Returns an error starting with KEY_LOCKED_ERROR if the key needs unlocking
fn resolve_ssh_key(ssh_key_path: Option<&str>) -> Result<Option<String>, String> {
    let Some(key_path) = ssh_key_path else {
        return Ok(None);
    };

    let path = PathBuf::from(key_path);

    // Check if key needs unlocking
    if needs_unlock(&path).map_err(|e| e.to_string())? {
        return Err(format!("{}{}", KEY_LOCKED_ERROR, key_path));
    }

    // Get decrypted key path (or None if not encrypted)
    match get_decrypted_key_path(&path) {
        Ok(Some(decrypted_path)) => Ok(Some(decrypted_path.to_string_lossy().to_string())),
        Ok(None) => Ok(Some(key_path.to_string())), // Not encrypted, use original
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn get_remotes(repo_path: String) -> Result<Vec<Remote>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::get_remotes(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_remote(repo_path: String, name: String, url: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::add_remote(&executor, &name, &url).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_remote(repo_path: String, name: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::remove_remote(&executor, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_remote(
    repo_path: String,
    remote: Option<String>,
    prune: bool,
    ssh_key_path: Option<String>,
) -> Result<(), String> {
    let resolved_key = resolve_ssh_key(ssh_key_path.as_deref())?;
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::fetch(&executor, remote.as_deref(), prune, resolved_key.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pull_remote(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
    rebase: bool,
    ssh_key_path: Option<String>,
) -> Result<(), String> {
    let resolved_key = resolve_ssh_key(ssh_key_path.as_deref())?;
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::pull(
        &executor,
        remote.as_deref(),
        branch.as_deref(),
        rebase,
        resolved_key.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn push_remote(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
    force: bool,
    set_upstream: bool,
    push_tags: bool,
    ssh_key_path: Option<String>,
) -> Result<(), String> {
    let resolved_key = resolve_ssh_key(ssh_key_path.as_deref())?;
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::push(
        &executor,
        remote.as_deref(),
        branch.as_deref(),
        force,
        set_upstream,
        push_tags,
        resolved_key.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_remote_connection(
    repo_path: String,
    remote: String,
    ssh_key_path: Option<String>,
) -> Result<(), String> {
    let resolved_key = resolve_ssh_key(ssh_key_path.as_deref())?;
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::test_connection(&executor, &remote, resolved_key.as_deref())
        .map_err(|e| e.to_string())
}
