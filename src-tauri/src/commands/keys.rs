use crate::keys::{
    convert_ppk_to_openssh, get_converted_key_path, get_key_info, get_ppk_version,
    is_ppk_file, KeyFormat, PpkVersion,
    // Session management
    needs_unlock, unlock_key, lock_key, lock_all_keys, is_key_unlocked,
};
#[allow(unused_imports)]
use crate::keys::KeyError;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct KeyInfoDto {
    pub path: String,
    pub format: String,
    pub encrypted: bool,
    pub needs_conversion: bool,
    pub ppk_version: Option<String>,
}

#[tauri::command]
pub async fn check_ssh_key(path: String) -> Result<KeyInfoDto, String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    let info = get_key_info(&path).map_err(|e| e.to_string())?;

    let format_str = match info.format {
        KeyFormat::Ppk => "ppk",
        KeyFormat::OpenSsh => "openssh",
        KeyFormat::Pem => "pem",
        KeyFormat::Unknown => "unknown",
    };

    let needs_conversion = matches!(info.format, KeyFormat::Ppk);

    // Get PPK version if applicable
    let ppk_version = if needs_conversion {
        match get_ppk_version(&path) {
            PpkVersion::V2 => Some("v2".to_string()),
            PpkVersion::V3 => Some("v3".to_string()),
            PpkVersion::Unknown => None,
        }
    } else {
        None
    };

    Ok(KeyInfoDto {
        path: path.to_string_lossy().to_string(),
        format: format_str.to_string(),
        encrypted: info.encrypted,
        needs_conversion,
        ppk_version,
    })
}

#[tauri::command]
pub async fn convert_ssh_key(
    app: AppHandle,
    source_path: String,
    passphrase: Option<String>,
) -> Result<String, String> {
    let source = PathBuf::from(&source_path);

    if !source.exists() {
        return Err("Source file does not exist".to_string());
    }

    if !is_ppk_file(&source) {
        return Err("File is not a PuTTY PPK file".to_string());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let output_path = get_converted_key_path(&app_data_dir, &source);

    convert_ppk_to_openssh(&source, &output_path, passphrase.as_deref())
        .map_err(|e| e.to_string())?;

    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_converted_key_path_cmd(
    app: AppHandle,
    source_path: String,
) -> Result<Option<String>, String> {
    let source = PathBuf::from(&source_path);

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let converted_path = get_converted_key_path(&app_data_dir, &source);

    if converted_path.exists() {
        Ok(Some(converted_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

/// Check if an SSH key needs to be unlocked (encrypted but passphrase not cached)
#[tauri::command]
pub async fn ssh_key_needs_unlock(key_path: String) -> Result<bool, String> {
    let path = PathBuf::from(&key_path);
    needs_unlock(&path).map_err(|e| e.to_string())
}

/// Check if an SSH key is currently unlocked (passphrase cached)
#[tauri::command]
pub async fn ssh_key_is_unlocked(key_path: String) -> Result<bool, String> {
    let path = PathBuf::from(&key_path);
    Ok(is_key_unlocked(&path))
}

/// Unlock an SSH key by providing the passphrase (cached securely in memory)
#[tauri::command]
pub async fn ssh_key_unlock(key_path: String, passphrase: String) -> Result<(), String> {
    let path = PathBuf::from(&key_path);
    unlock_key(&path, &passphrase).map_err(|e| e.to_string())
}

/// Lock a specific SSH key (remove passphrase from cache)
#[tauri::command]
pub async fn ssh_key_lock(key_path: String) -> Result<(), String> {
    let path = PathBuf::from(&key_path);
    lock_key(&path);
    Ok(())
}

/// Lock all SSH keys (clear passphrase cache)
#[tauri::command]
pub async fn ssh_keys_lock_all() -> Result<(), String> {
    lock_all_keys();
    Ok(())
}
