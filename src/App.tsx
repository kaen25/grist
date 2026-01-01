import { AppLayout } from '@/presentation/components/layout';
import { StatusView } from '@/presentation/components/status';
import { HistoryView } from '@/presentation/components/history';
import { BranchesView } from '@/presentation/components/branches';
import { useUIStore } from '@/application/stores';
import { Toaster } from '@/components/ui/sonner';

function StashView() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h2 className="text-lg font-medium">Stash</h2>
        <p className="text-sm">Stashed changes will appear here</p>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h2 className="text-lg font-medium">Settings</h2>
        <p className="text-sm">Application settings will appear here</p>
      </div>
    </div>
  );
}

function App() {
  const { currentView } = useUIStore();

  const renderView = () => {
    switch (currentView) {
      case 'status':
        return <StatusView />;
      case 'history':
        return <HistoryView />;
      case 'branches':
        return <BranchesView />;
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
