import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function cleanRef(ref: string) {
  return ref
    .replace('HEAD -> ', '')
    .replace('tag: ', '')
    .replace('refs/heads/', '')
    .replace('refs/tags/', '')
    .replace('refs/remotes/', '');
}

export function isTagRef(ref: string) {
  return ref.includes('tag:') || ref.includes('refs/tags/');
}

export function isRemoteRef(ref: string) {
  return ref.includes('origin/') || ref.includes('refs/remotes/');
}

export function isHeadRef(ref: string) {
  return ref.startsWith('HEAD -> ');
}