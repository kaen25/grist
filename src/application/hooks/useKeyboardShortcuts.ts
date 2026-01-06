import { useEffect } from 'react';
import { useUIStore } from '@/application/stores';
import { useStagingActions } from './useStagingActions';

export function useKeyboardShortcuts() {
  const { setCurrentView } = useUIStore();
  const { stageAll, unstageAll } = useStagingActions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // View switching: Ctrl+1-5
      if (ctrl && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const views = ['status', 'history', 'remotes', 'stash', 'settings'] as const;
        const index = parseInt(e.key) - 1;
        if (views[index]) {
          setCurrentView(views[index]);
        }
        return;
      }

      // Refresh: F5
      if (e.key === 'F5') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('grist:refresh'));
        return;
      }

      // Stage all: Ctrl+S (when not in input)
      if (ctrl && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        stageAll();
        return;
      }

      // Unstage all: Ctrl+Shift+S
      if (ctrl && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        unstageAll();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentView, stageAll, unstageAll]);
}
