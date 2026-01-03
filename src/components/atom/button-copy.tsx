import { useState } from "react";
import { Button } from "../ui/button";
import { Check, Copy } from "lucide-react";

export type PropsButtonCopy= {
    textToCopy: string;
    timeout?: number;
}

export function ButtonCopy({
    textToCopy,
    timeout = 2000,
}: PropsButtonCopy) {

    const [copied, setCopied] = useState(false);

    const handleCopyHash = async () => {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 cursor-copy"
            onClick={handleCopyHash}
            title="Copy full hash"
        >
            {
                copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                ) : (
                    <Copy className="h-3 w-3" />
                )
            }
        </Button>
    )
}