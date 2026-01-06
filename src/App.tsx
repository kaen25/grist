import { AppLayout } from '@/presentation/components/layout';
import { StatusView } from '@/presentation/components/status';
import { HistoryView } from '@/presentation/components/history';
import { RemotesView } from '@/presentation/components/remotes';
import { StashView } from '@/presentation/components/stash';
import { SettingsView } from '@/presentation/components/settings';
import { useUIStore } from '@/application/stores';
import { useKeyboardShortcuts } from '@/application/hooks';
import { Toaster } from '@/components/ui/sonner';

function App() {
  useKeyboardShortcuts();
  const { currentView } = useUIStore();

  const renderView = () => {
    switch (currentView) {
      case 'status':
        return <StatusView />;
      case 'history':
        return <HistoryView />;
      case 'remotes':
        return <RemotesView />;
      case 'stash':
        return <StashView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <StatusView />;
    }
  };

  return (
    <>
      <AppLayout>{renderView()}</AppLayout>
      <Toaster />
    </>
  );
}

export default App;
