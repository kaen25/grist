import { AppLayout } from '@/presentation/components/layout';
import { useUIStore } from '@/application/stores';

// Placeholder views - will be implemented in later phases
function StatusView() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h2 className="text-lg font-medium">Changes</h2>
        <p className="text-sm">Open a repository to see changes</p>
      </div>
    </div>
  );
}

function HistoryView() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h2 className="text-lg font-medium">History</h2>
        <p className="text-sm">Commit history will appear here</p>
      </div>
    </div>
  );
}

function BranchesView() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h2 className="text-lg font-medium">Branches</h2>
        <p className="text-sm">Branch management will appear here</p>
      </div>
    </div>
  );
}

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

  return <AppLayout>{renderView()}</AppLayout>;
}

export default App;
