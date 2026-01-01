mod commands;
mod git;

use commands::{
    get_git_status, get_git_version, get_repository_info, is_git_repository, open_repository,
    stage_file, stage_all, unstage_file, unstage_all, discard_changes,
    get_file_diff, get_commit_diff, get_untracked_file_diff, stage_lines, unstage_lines,
    get_blob_base64,
    create_commit, get_last_commit_message,
    get_commit_log,
    get_branches, create_branch, delete_branch, checkout_branch, rename_branch, delete_remote_branch,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
            delete_remote_branch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
