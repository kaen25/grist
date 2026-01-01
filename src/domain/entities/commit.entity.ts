export interface Commit {
  hash: string;
  short_hash: string;
  author_name: string;
  author_email: string;
  author_date: string;
  author_timestamp: number;
  committer_name: string;
  committer_email: string;
  committer_date: string;
  committer_timestamp: number;
  subject: string;
  body: string;
  parent_hashes: string[];
  refs: string[];
}
