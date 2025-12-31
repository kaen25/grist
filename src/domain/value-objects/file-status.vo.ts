export type FileStatus =
  | 'Unmodified'
  | 'Modified'
  | 'Added'
  | 'Deleted'
  | { Renamed: { from: string } }
  | { Copied: { from: string } }
  | 'TypeChanged'
  | 'Untracked'
  | 'Ignored'
  | 'Conflicted';
