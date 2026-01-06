import { Moon, Sun, Monitor } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const {
    fontSize,
    diffContextLines,
    pollInterval,
    setFontSize,
    setDiffContextLines,
    setPollInterval,
  } = useSettingsStore();

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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Font Size</Label>
                <span className="text-sm text-muted-foreground">{fontSize}px</span>
              </div>
              <Slider
                value={[fontSize]}
                onValueChange={([v]) => setFontSize(v)}
                min={10}
                max={18}
                step={1}
              />
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
      </div>
    </div>
  );
}
