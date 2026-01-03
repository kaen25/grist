import { type Dispatch, type SetStateAction, useCallback } from "react";
import { useToggle } from "./useToggle";

export function useLoading<T extends unknown[] = []>(
    asyncFn: (...params: T) => Promise<void>,
    onError?: (err: unknown) => void
): [(...params: T) => Promise<void>, boolean, Dispatch<SetStateAction<boolean>>] {
    const [isLoading, setStatus] = useToggle();

    const execute = useCallback(async (...params: T) => {
        setStatus(true);
        try {
            await asyncFn(...params);
        } catch (error: unknown) {
            if(typeof onError === 'function') {
                onError(error)
            } else {
                console.error(error);
            }
        } finally {
            setStatus(false);
        }
    }, [asyncFn, setStatus, onError]);

    return [ execute, isLoading, setStatus ];
}
