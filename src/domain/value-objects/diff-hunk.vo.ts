export type DiffLineType = 'Context' | 'Addition' | 'Deletion' | 'Header';

export interface DiffLine {
  line_type: DiffLineType;
  old_line_number: number | null;
  new_line_number: number | null;
  content: string;
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}
