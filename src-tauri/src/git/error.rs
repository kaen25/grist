use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize, Clone)]
pub enum GitError {
    #[error("Git executable not found")]
    GitNotFound,

    #[error("Not a git repository: {path}")]
    NotARepository { path: String },

    #[error("Command failed with exit code {code}: {stderr}")]
    CommandFailed { code: i32, stderr: String },

    #[error("Failed to parse git output: {message}")]
    ParseError { message: String },

    #[error("Operation in progress: {operation}")]
    OperationInProgress { operation: String },

    #[error("Merge conflict detected")]
    MergeConflict,

    #[error("Uncommitted changes would be overwritten")]
    UncommittedChanges,

    #[error("Branch {name} already exists")]
    BranchExists { name: String },

    #[error("Branch {name} not found")]
    BranchNotFound { name: String },

    #[error("Remote {name} not found")]
    RemoteNotFound { name: String },

    #[error("IO error: {message}")]
    IoError { message: String },
}

impl From<GitError> for String {
    fn from(error: GitError) -> Self {
        error.to_string()
    }
}
