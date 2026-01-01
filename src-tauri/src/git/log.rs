use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::Commit;

const LOG_FORMAT: &str = "%H%x00%h%x00%an%x00%ae%x00%aI%x00%at%x00%s%x00%b%x00%P%x00%D%x00---END---";

pub fn get_commit_log(
    executor: &GitExecutor,
    count: u32,
    skip: u32,
) -> Result<Vec<Commit>, GitError> {
    let output = executor.execute_checked(&[
        "log",
        &format!("--format={}", LOG_FORMAT),
        "-n",
        &count.to_string(),
        "--skip",
        &skip.to_string(),
    ])?;

    parse_log(&output)
}

fn parse_log(output: &str) -> Result<Vec<Commit>, GitError> {
    let mut commits = Vec::new();

    for entry in output.split("---END---").filter(|s| !s.trim().is_empty()) {
        let parts: Vec<&str> = entry.trim().split('\0').collect();
        if parts.len() < 10 {
            continue;
        }

        let parent_hashes: Vec<String> = parts[8]
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();

        let refs: Vec<String> = parts[9]
            .split(", ")
            .filter(|s| !s.is_empty())
            .map(|s| s.trim().to_string())
            .collect();

        commits.push(Commit {
            hash: parts[0].to_string(),
            short_hash: parts[1].to_string(),
            author_name: parts[2].to_string(),
            author_email: parts[3].to_string(),
            date: parts[4].to_string(),
            timestamp: parts[5].parse().unwrap_or(0),
            subject: parts[6].to_string(),
            body: parts[7].to_string(),
            parent_hashes,
            refs,
        });
    }

    Ok(commits)
}
