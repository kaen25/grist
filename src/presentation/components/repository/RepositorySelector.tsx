import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRepositoryStore } from '@/application/stores';
import { useRepository } from '@/application/hooks';
import { toast } from 'sonner';

export function RepositorySelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { recentRepos } = useRepositoryStore();
  const { openRepository } = useRepository();

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Git Repository',
      });

      if (selected) {
        setIsLoading(true);
        await openRepository(selected);
        setIsOpen(false);
        toast.success('Repository opened');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Failed to open repository', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRecent = async (path: string) => {
    try {
      setIsLoading(true);
      await openRepository(path);
      setIsOpen(false);
      toast.success('Repository opened');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Failed to open repository', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FolderOpen className="mr-2 h-4 w-4" />
          Open
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open Repository</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            onClick={handleOpenFolder}
            disabled={isLoading}
            className="w-full"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Browse for folder...
          </Button>

          {recentRepos.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Recent Repositories
              </h4>
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {recentRepos.map((repo) => (
                    <Button
                      key={repo.path}
                      variant="ghost"
                      className="w-full justify-start text-left"
                      onClick={() => handleOpenRecent(repo.path)}
                      disabled={isLoading}
                    >
                      <div className="truncate">
                        <div className="font-medium">{repo.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {repo.path}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
