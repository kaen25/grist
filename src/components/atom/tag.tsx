import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { type ReactNode } from "react";

type PropsTag = {
    children: ReactNode;
    className?: string;
}

export function Tag({
    className,
    children
}: PropsTag) {

    return (
        <Badge
            variant="outline"
            className={cn(
            'text-xs font-normal rounded-sm px-1 py-0',
            className
            )}
        >
            {children}
        </Badge>

    )
}