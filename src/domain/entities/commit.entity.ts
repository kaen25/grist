export interface Commit {
  hash: string;
  short_hash: string;
  author_name: string;
  author_email: string;
  date: string;
  timestamp: number;
  subject: string;
  body: string;
  parent_hashes: string[];
  refs: string[];
}
