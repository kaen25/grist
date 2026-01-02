use crate::config::{AuthType, RemoteAuthConfig, get_remote_auth, set_remote_auth, remove_remote_auth};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoteAuthConfigDto {
    pub auth_type: String,
    pub ssh_key_path: Option<String>,
}

impl From<RemoteAuthConfig> for RemoteAuthConfigDto {
    fn from(config: RemoteAuthConfig) -> Self {
        Self {
            auth_type: match config.auth_type {
                AuthType::SshAgent => "ssh-agent".to_string(),
                AuthType::SshKey => "ssh-key".to_string(),
                AuthType::None => "none".to_string(),
            },
            ssh_key_path: config.ssh_key_path,
        }
    }
}

impl From<RemoteAuthConfigDto> for RemoteAuthConfig {
    fn from(dto: RemoteAuthConfigDto) -> Self {
        Self {
            auth_type: match dto.auth_type.as_str() {
                "ssh-agent" => AuthType::SshAgent,
                "ssh-key" => AuthType::SshKey,
                _ => AuthType::None,
            },
            ssh_key_path: dto.ssh_key_path,
        }
    }
}

#[tauri::command]
pub async fn get_remote_auth_config(
    app: AppHandle,
    repo_path: String,
    remote_name: String,
) -> Result<RemoteAuthConfigDto, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let config = get_remote_auth(&app_data_dir, &repo_path, &remote_name);
    Ok(config.into())
}

#[tauri::command]
pub async fn set_remote_auth_config(
    app: AppHandle,
    repo_path: String,
    remote_name: String,
    config: RemoteAuthConfigDto,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    set_remote_auth(&app_data_dir, &repo_path, &remote_name, config.into())
}

#[tauri::command]
pub async fn remove_remote_auth_config(
    app: AppHandle,
    repo_path: String,
    remote_name: String,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    remove_remote_auth(&app_data_dir, &repo_path, &remote_name)
}
