export interface Tag {
  name: string;
  hash: string;
  short_hash: string;
  message: string | null;
  tagger: string | null;
  date: string | null;
  is_annotated: boolean;
}
