import { useEffect, useState, useCallback } from 'react';
import { Moon, Sun, Monitor, Check, X, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/application/stores';
import { useTheme } from '@/presentation/providers';
import { tauriGitService } from '@/infrastructure/services';

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const {
    diffContextLines,
    pollInterval,
    gitPath,
    setDiffContextLines,
    setPollInterval,
    setGitPath,
  } = useSettingsStore();

  const [detectedPath, setDetectedPath] = useState<string>('');
  const [gitVersion, setGitVersion] = useState<string | null>(null);
  const [gitError, setGitError] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(false);

  // Load detected path on mount
  useEffect(() => {
    tauriGitService.getGitPath().then((path) => {
      setDetectedPath(path);
      if (!gitPath) {
        setGitPath(path);
      }
    }).catch(() => {});
  }, []);

  // Validate git path when it changes
  const validateGitPath = useCallback(async (path: string) => {
    if (!path.trim()) {
      setGitVersion(null);
      setGitError(false);
      return;
    }

    setIsChecking(true);
    setGitError(false);
    setGitVersion(null);

    try {
      const version = await tauriGitService.testGitPath(path);
      setGitVersion(version);
      setGitError(false);
    } catch {
      setGitError(true);
      setGitVersion(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validateGitPath(gitPath);
    }, 500);
    return () => clearTimeout(timer);
  }, [gitPath, validateGitPath]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">
            Customize your Grist experience
          </p>
        </div>

        <Separator />

        {/* Appearance */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Appearance</h3>

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred theme
                </p>
              </div>
              <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        {/* Diff */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Diff</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Context Lines</Label>
              <span className="text-sm text-muted-foreground">
                {diffContextLines} lines
              </span>
            </div>
            <Slider
              value={[diffContextLines]}
              onValueChange={([v]) => setDiffContextLines(v)}
              min={1}
              max={10}
              step={1}
            />
          </div>
        </section>

        <Separator />

        {/* Performance */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Performance</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Status Poll Interval</Label>
                <p className="text-sm text-muted-foreground">
                  How often to check for changes
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {pollInterval / 1000}s
              </span>
            </div>
            <Slider
              value={[pollInterval]}
              onValueChange={([v]) => setPollInterval(v)}
              min={1000}
              max={10000}
              step={1000}
            />
          </div>
        </section>

        <Separator />

        {/* Git */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Git</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="git-path">Git Binary Path</Label>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : gitError ? (
                  <>
                    <X className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Invalid</span>
                  </>
                ) : gitVersion ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-xs">{gitVersion.replace('git version ', '')}</span>
                  </>
                ) : null}
              </span>
            </div>
            <Input
              id="git-path"
              placeholder={detectedPath || '/usr/bin/git'}
              value={gitPath}
              onChange={(e) => setGitPath(e.target.value)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
