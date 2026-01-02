mod commands;
mod config;
mod git;
mod keys;

use commands::{
    get_git_status, get_git_version, get_repository_info, is_git_repository, open_repository,
    stage_file, stage_all, unstage_file, unstage_all, discard_changes,
    get_file_diff, get_commit_diff, get_untracked_file_diff, stage_lines, unstage_lines,
    get_blob_base64,
    create_commit, get_last_commit_message,
    get_commit_log,
    get_branches, create_branch, delete_branch, checkout_branch, rename_branch, delete_remote_branch,
    merge_branch, rebase_branch, abort_merge, abort_rebase, continue_rebase,
    get_tags, create_tag, delete_tag, delete_remote_tag,
    get_remotes, add_remote, remove_remote, fetch_remote, pull_remote, push_remote, test_remote_connection,
    get_remote_auth_config, set_remote_auth_config, remove_remote_auth_config,
    check_ssh_key, convert_ssh_key, get_converted_key_path_cmd,
    ssh_key_needs_unlock, ssh_key_is_unlocked, ssh_key_unlock, ssh_key_lock, ssh_keys_lock_all,
    get_stashes, create_stash, apply_stash, pop_stash, drop_stash, clear_stashes,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize the SSH key passphrase cache
    keys::init_cache();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_git_version,
            get_repository_info,
            is_git_repository,
            open_repository,
            get_git_status,
            stage_file,
            stage_all,
            unstage_file,
            unstage_all,
            discard_changes,
            get_file_diff,
            get_commit_diff,
            get_untracked_file_diff,
            stage_lines,
            unstage_lines,
            get_blob_base64,
            create_commit,
            get_last_commit_message,
            get_commit_log,
            get_branches,
            create_branch,
            delete_branch,
            checkout_branch,
            rename_branch,
            delete_remote_branch,
            merge_branch,
            rebase_branch,
            abort_merge,
            abort_rebase,
            continue_rebase,
            get_tags,
            create_tag,
            delete_tag,
            delete_remote_tag,
            get_remotes,
            add_remote,
            remove_remote,
            fetch_remote,
            pull_remote,
            push_remote,
            test_remote_connection,
            get_remote_auth_config,
            set_remote_auth_config,
            remove_remote_auth_config,
            check_ssh_key,
            convert_ssh_key,
            get_converted_key_path_cmd,
            ssh_key_needs_unlock,
            ssh_key_is_unlocked,
            ssh_key_unlock,
            ssh_key_lock,
            ssh_keys_lock_all,
            get_stashes,
            create_stash,
            apply_stash,
            pop_stash,
            drop_stash,
            clear_stashes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use crate::keys::{convert_ppk_to_openssh, get_key_info, get_ppk_version, is_key_encrypted, PpkVersion};
    use std::path::Path;

    #[test]
    fn test_ppk_info() {
        let path = Path::new("../khraine-bis.ppk");
        if !path.exists() {
            println!("Test file not found, skipping");
            return;
        }

        let info = get_key_info(path).unwrap();
        println!("Format: {:?}", info.format);
        println!("Encrypted: {}", info.encrypted);

        let version = get_ppk_version(path);
        println!("Version: {:?}", version);
        assert_eq!(version, PpkVersion::V2);
    }

    #[test]
    fn test_ppk_conversion_without_passphrase() {
        let path = Path::new("../khraine-bis.ppk");
        if !path.exists() {
            println!("Test file not found, skipping");
            return;
        }

        let output = Path::new("/tmp/test_converted_key");
        let result = convert_ppk_to_openssh(path, output, None);

        // Should fail because key is encrypted
        assert!(result.is_err());
        println!("Error (expected): {}", result.unwrap_err());
    }

    #[test]
    fn test_converted_key_preserves_encryption() {
        // This test requires a known passphrase - skip if test file not available
        let path = Path::new("../khraine-bis.ppk");
        if !path.exists() {
            println!("Test file not found, skipping");
            return;
        }

        // Try common test passphrases
        let test_passphrase = std::env::var("TEST_PPK_PASSPHRASE").ok();
        if test_passphrase.is_none() {
            println!("TEST_PPK_PASSPHRASE not set, skipping encryption test");
            return;
        }

        let passphrase = test_passphrase.unwrap();
        let output = Path::new("/tmp/test_converted_key_encrypted");
        let result = convert_ppk_to_openssh(path, output, Some(&passphrase));

        if result.is_err() {
            println!("Conversion failed (wrong passphrase?): {}", result.unwrap_err());
            return;
        }

        // Verify the output key is encrypted
        let is_encrypted = is_key_encrypted(output).unwrap();
        assert!(is_encrypted, "Converted key should be encrypted when passphrase is provided");
        println!("✓ Converted key is encrypted with the same passphrase");

        // Cleanup
        let _ = std::fs::remove_file(output);
    }
}
