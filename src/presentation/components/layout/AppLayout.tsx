import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <StatusBar />
    </div>
  );
}
