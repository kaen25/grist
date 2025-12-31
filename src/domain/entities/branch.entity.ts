export interface Branch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  remote_name: string | null;
  tracking: string | null;
  ahead: number;
  behind: number;
  last_commit_hash: string | null;
  last_commit_date: string | null;
}
