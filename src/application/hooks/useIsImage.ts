import { IMAGE_EXTENSIONS } from "@/settings";
import { useMemo } from "react";


export function useIsImage(path: string): boolean {
    return useMemo(() => {
        const ext = path.toLowerCase().substring(path.lastIndexOf('.'));
        return IMAGE_EXTENSIONS.includes(ext);
      }, [path]);
}