use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Authentication type for a remote
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum AuthType {
    /// Use system SSH agent
    SshAgent,
    /// Use a specific SSH key file
    SshKey,
    /// No authentication configured (use git defaults)
    None,
}

impl Default for AuthType {
    fn default() -> Self {
        AuthType::None
    }
}

/// Configuration for a single remote
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteAuthConfig {
    /// Authentication type
    #[serde(default)]
    pub auth_type: AuthType,
    /// Path to SSH private key (for SshKey auth type)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ssh_key_path: Option<String>,
}

impl Default for RemoteAuthConfig {
    fn default() -> Self {
        Self {
            auth_type: AuthType::None,
            ssh_key_path: None,
        }
    }
}

/// Configuration for all remotes in a repository
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RepositoryRemotesConfig {
    /// Map of remote name to auth config
    pub remotes: HashMap<String, RemoteAuthConfig>,
}

/// Get the config file path for a repository
fn get_config_path(app_data_dir: &PathBuf, repo_path: &str) -> PathBuf {
    // Create a hash of the repo path for the directory name
    let repo_hash = format!("{:x}", md5::compute(repo_path));
    app_data_dir
        .join("repositories")
        .join(&repo_hash)
        .join("remotes.json")
}

/// Load remote auth config for a repository
pub fn load_config(app_data_dir: &PathBuf, repo_path: &str) -> RepositoryRemotesConfig {
    let config_path = get_config_path(app_data_dir, repo_path);

    if config_path.exists() {
        match fs::read_to_string(&config_path) {
            Ok(content) => {
                serde_json::from_str(&content).unwrap_or_default()
            }
            Err(_) => RepositoryRemotesConfig::default(),
        }
    } else {
        RepositoryRemotesConfig::default()
    }
}

/// Save remote auth config for a repository
pub fn save_config(
    app_data_dir: &PathBuf,
    repo_path: &str,
    config: &RepositoryRemotesConfig,
) -> Result<(), String> {
    let config_path = get_config_path(app_data_dir, repo_path);

    // Create parent directories
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

/// Get auth config for a specific remote
pub fn get_remote_auth(
    app_data_dir: &PathBuf,
    repo_path: &str,
    remote_name: &str,
) -> RemoteAuthConfig {
    let config = load_config(app_data_dir, repo_path);
    config.remotes.get(remote_name).cloned().unwrap_or_default()
}

/// Set auth config for a specific remote
pub fn set_remote_auth(
    app_data_dir: &PathBuf,
    repo_path: &str,
    remote_name: &str,
    auth_config: RemoteAuthConfig,
) -> Result<(), String> {
    let mut config = load_config(app_data_dir, repo_path);
    config.remotes.insert(remote_name.to_string(), auth_config);
    save_config(app_data_dir, repo_path, &config)
}

/// Remove auth config for a specific remote
pub fn remove_remote_auth(
    app_data_dir: &PathBuf,
    repo_path: &str,
    remote_name: &str,
) -> Result<(), String> {
    let mut config = load_config(app_data_dir, repo_path);
    config.remotes.remove(remote_name);
    save_config(app_data_dir, repo_path, &config)
}
