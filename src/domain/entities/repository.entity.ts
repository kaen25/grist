export interface Repository {
  path: string;
  name: string;
  branch: string | null;
  remote_url: string | null;
}
