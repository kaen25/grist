use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub path: String,
    pub name: String,
    pub branch: Option<String>,
    pub remote_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FileStatus {
    Unmodified,
    Modified,
    Added,
    Deleted,
    Renamed { from: String },
    Copied { from: String },
    TypeChanged,
    Untracked,
    Ignored,
    Conflicted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusEntry {
    pub path: String,
    pub index_status: FileStatus,
    pub worktree_status: FileStatus,
    pub original_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub staged: Vec<StatusEntry>,
    pub unstaged: Vec<StatusEntry>,
    pub untracked: Vec<StatusEntry>,
    pub conflicted: Vec<StatusEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Commit {
    pub hash: String,
    pub short_hash: String,
    pub author_name: String,
    pub author_email: String,
    pub date: String,
    pub timestamp: i64,
    pub subject: String,
    pub body: String,
    pub parent_hashes: Vec<String>,
    pub refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub remote_name: Option<String>,
    pub tracking: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub last_commit_hash: Option<String>,
    pub last_commit_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Remote {
    pub name: String,
    pub fetch_url: String,
    pub push_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stash {
    pub index: u32,
    pub message: String,
    pub branch: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffLine {
    pub line_type: DiffLineType,
    pub old_line_number: Option<u32>,
    pub new_line_number: Option<u32>,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
    Header,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub old_path: Option<String>,
    pub new_path: String,
    pub status: FileStatus,
    pub hunks: Vec<DiffHunk>,
    pub is_binary: bool,
    pub additions: u32,
    pub deletions: u32,
}
