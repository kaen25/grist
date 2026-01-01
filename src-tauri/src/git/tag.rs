use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Tag {
    pub name: String,
    pub hash: String,
    pub short_hash: String,
    pub message: Option<String>,
    pub tagger: Option<String>,
    pub date: Option<String>,
    pub is_annotated: bool,
}

pub fn get_tags(executor: &GitExecutor) -> Result<Vec<Tag>, GitError> {
    // Get all tags with their info
    // Format: refname, objectname, short objectname, taggername, taggerdate, contents:subject
    let output = executor.execute_checked(&[
        "tag",
        "-l",
        "--format=%(refname:short)%00%(objectname)%00%(objectname:short)%00%(taggername)%00%(taggerdate:iso8601)%00%(contents:subject)%00%(*objectname)",
    ])?;

    parse_tags(&output)
}

fn parse_tags(output: &str) -> Result<Vec<Tag>, GitError> {
    let mut tags = Vec::new();

    for line in output.lines().filter(|l| !l.is_empty()) {
        let parts: Vec<&str> = line.split('\0').collect();
        if parts.len() < 7 {
            continue;
        }

        let name = parts[0].to_string();
        let hash = parts[1].to_string();
        let short_hash = parts[2].to_string();
        let tagger = if parts[3].is_empty() { None } else { Some(parts[3].to_string()) };
        let date = if parts[4].is_empty() { None } else { Some(parts[4].to_string()) };
        let message = if parts[5].is_empty() { None } else { Some(parts[5].to_string()) };
        // If *objectname is non-empty, it's an annotated tag (points to a tag object that points to a commit)
        let is_annotated = !parts[6].is_empty() || tagger.is_some();

        tags.push(Tag {
            name,
            hash,
            short_hash,
            message,
            tagger,
            date,
            is_annotated,
        });
    }

    Ok(tags)
}

pub fn create_tag(
    executor: &GitExecutor,
    name: &str,
    commit: Option<&str>,
    message: Option<&str>,
) -> Result<(), GitError> {
    let mut args = vec!["tag"];

    // If message provided, create annotated tag
    if let Some(msg) = message {
        args.push("-a");
        args.push(name);
        if let Some(c) = commit {
            args.push(c);
        }
        args.push("-m");
        args.push(msg);
    } else {
        // Lightweight tag
        args.push(name);
        if let Some(c) = commit {
            args.push(c);
        }
    }

    executor.execute_checked(&args)?;
    Ok(())
}

pub fn delete_tag(executor: &GitExecutor, name: &str) -> Result<(), GitError> {
    executor.execute_checked(&["tag", "-d", name])?;
    Ok(())
}

pub fn delete_remote_tag(executor: &GitExecutor, remote: &str, name: &str) -> Result<(), GitError> {
    executor.execute_checked(&["push", remote, "--delete", &format!("refs/tags/{}", name)])?;
    Ok(())
}
