import { useCallback, useState } from "react";


export function useToggle(initial = false) {
    const [status, setStatus] = useState(initial)

    const toggle = useCallback(() => {
        setStatus(prev => !prev);
    }, []);

    return [status, setStatus, toggle] as const
}