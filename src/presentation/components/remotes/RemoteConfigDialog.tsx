import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import type { Remote } from '@/domain/entities';
import type { AuthType, SshKeyInfo } from '@/domain/interfaces';
import { toast } from 'sonner';
import {
  Settings,
  FolderOpen,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { SshUnlockDialog, isSshKeyLockedError } from './SshUnlockDialog';

interface RemoteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remote: Remote | null;
  onSaved?: () => void;
}

export function RemoteConfigDialog({
  open: isOpen,
  onOpenChange,
  remote,
  onSaved,
}: RemoteConfigDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const [authType, setAuthType] = useState<AuthType>('none');
  const [sshKeyPath, setSshKeyPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // PPK conversion state
  const [keyInfo, setKeyInfo] = useState<SshKeyInfo | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [convertedPath, setConvertedPath] = useState<string | null>(null);

  // SSH key unlock state
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [lockedKeyPath, setLockedKeyPath] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentRepo && remote) {
      loadConfig();
    }
  }, [isOpen, currentRepo, remote]);

  // Check key info when path changes
  useEffect(() => {
    const checkKey = async () => {
      if (!sshKeyPath) {
        setKeyInfo(null);
        setConvertedPath(null);
        return;
      }
      try {
        const info = await tauriGitService.checkSshKey(sshKeyPath);
        setKeyInfo(info);

        // Check if we already have a converted version
        if (info.needs_conversion) {
          const existing = await tauriGitService.getConvertedKeyPath(sshKeyPath);
          setConvertedPath(existing);
        } else {
          setConvertedPath(null);
        }
      } catch {
        setKeyInfo(null);
        setConvertedPath(null);
      }
    };
    checkKey();
  }, [sshKeyPath]);

  const loadConfig = async () => {
    if (!currentRepo || !remote) return;
    setIsLoading(true);
    setTestResult(null);
    setKeyInfo(null);
    setConvertedPath(null);
    setPassphrase('');
    try {
      const config = await tauriGitService.getRemoteAuthConfig(currentRepo.path, remote.name);
      setAuthType(config.auth_type);
      setSshKeyPath(config.ssh_key_path || '');
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseKey = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'SSH Keys', extensions: ['pem', 'ppk', ''] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (selected) {
        setSshKeyPath(selected as string);
        setTestResult(null);
        setPassphrase('');
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  };

  const handleConvert = async () => {
    if (!sshKeyPath) return;
    setIsConverting(true);
    try {
      const newPath = await tauriGitService.convertSshKey(
        sshKeyPath,
        passphrase || undefined
      );
      setConvertedPath(newPath);

      // Also unlock the converted key with the same passphrase
      if (passphrase) {
        try {
          await tauriGitService.sshKeyUnlock(newPath, passphrase);
        } catch {
          // Ignore unlock errors - user can unlock manually later
        }
      }

      toast.success('Key converted successfully');
    } catch (error) {
      const errMsg = String(error);
      if (errMsg.includes('encrypted') || errMsg.includes('passphrase')) {
        toast.error('Key is encrypted. Please enter the passphrase.');
      } else {
        toast.error(`Conversion failed: ${error}`);
      }
    } finally {
      setIsConverting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!currentRepo || !remote) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      // Use converted path if available, otherwise original
      const keyPath = authType === 'ssh-key'
        ? (convertedPath || sshKeyPath)
        : undefined;
      await tauriGitService.testRemoteConnection(currentRepo.path, remote.name, keyPath);
      setTestResult('success');
      toast.success('Connection successful');
    } catch (error) {
      // Check if key needs unlocking
      const lockedKey = isSshKeyLockedError(error);
      if (lockedKey) {
        setLockedKeyPath(lockedKey);
        setShowUnlockDialog(true);
      } else {
        setTestResult('error');
        toast.error(`Connection failed: ${error}`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleKeyUnlocked = () => {
    // Retry the test after unlocking
    handleTestConnection();
  };

  const handleSave = async () => {
    if (!currentRepo || !remote) return;
    setIsSaving(true);
    try {
      // Use converted path if available
      const finalKeyPath = authType === 'ssh-key'
        ? (convertedPath || sshKeyPath)
        : undefined;

      await tauriGitService.setRemoteAuthConfig(currentRepo.path, remote.name, {
        auth_type: authType,
        ssh_key_path: finalKeyPath,
      });
      toast.success('Configuration saved');
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(`Failed to save: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTestResult(null);
      setPassphrase('');
    }
    onOpenChange(open);
  };

  const needsConversion = keyInfo?.needs_conversion && !convertedPath;
  const canSave = authType !== 'ssh-key' || (sshKeyPath && !needsConversion);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Remote: {remote?.name}
          </DialogTitle>
          <DialogDescription>
            Configure authentication for this remote
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">URL</Label>
              <div className="text-sm font-mono bg-muted p-2 rounded truncate">
                {remote?.fetch_url}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Authentication Method</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="authType"
                    value="none"
                    checked={authType === 'none'}
                    onChange={() => {
                      setAuthType('none');
                      setTestResult(null);
                    }}
                    className="h-4 w-4"
                  />
                  <span>Default (use system Git config)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="authType"
                    value="ssh-agent"
                    checked={authType === 'ssh-agent'}
                    onChange={() => {
                      setAuthType('ssh-agent');
                      setTestResult(null);
                    }}
                    className="h-4 w-4"
                  />
                  <span>SSH Agent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="authType"
                    value="ssh-key"
                    checked={authType === 'ssh-key'}
                    onChange={() => {
                      setAuthType('ssh-key');
                      setTestResult(null);
                    }}
                    className="h-4 w-4"
                  />
                  <span>SSH Key File</span>
                </label>
              </div>
            </div>

            {authType === 'ssh-key' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="ssh-key-path">SSH Private Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ssh-key-path"
                      value={sshKeyPath}
                      onChange={(e) => {
                        setSshKeyPath(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder="/home/user/.ssh/id_rsa"
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleBrowseKey}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* PPK Detection and Conversion */}
                {keyInfo?.needs_conversion && (
                  <Alert variant="default" className="border-yellow-500 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="ml-2">
                      {convertedPath ? (
                        <span className="text-green-600">
                          Key converted! Using: {convertedPath.split('/').pop()}
                        </span>
                      ) : (
                        <div className="space-y-2">
                          <p>
                            PuTTY key detected ({keyInfo.ppk_version?.toUpperCase() || 'PPK'}).
                            {keyInfo.encrypted
                              ? ' Passphrase required for conversion.'
                              : ' Conversion to OpenSSH format is required.'}
                          </p>
                          {keyInfo.encrypted && (
                            <div className="space-y-1">
                              <Label htmlFor="passphrase" className="text-xs">
                                Passphrase
                              </Label>
                              <Input
                                id="passphrase"
                                type="password"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                placeholder="Enter passphrase"
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleConvert}
                            disabled={isConverting || (keyInfo.encrypted && !passphrase)}
                          >
                            {isConverting ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Convert to OpenSSH
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {keyInfo && !keyInfo.needs_conversion && (
                  <p className="text-xs text-muted-foreground">
                    Key format: {keyInfo.format.toUpperCase()}
                    {keyInfo.encrypted && ' (encrypted)'}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || (authType === 'ssh-key' && (!sshKeyPath || needsConversion))}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : testResult === 'success' ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : testResult === 'error' ? (
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                ) : null}
                Test Connection
              </Button>
              {testResult === 'success' && (
                <span className="text-sm text-green-500">Connected!</span>
              )}
              {testResult === 'error' && (
                <span className="text-sm text-red-500">Failed</span>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading || !canSave}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {lockedKeyPath && (
      <SshUnlockDialog
        open={showUnlockDialog}
        onOpenChange={setShowUnlockDialog}
        keyPath={lockedKeyPath}
        onUnlocked={handleKeyUnlocked}
      />
    )}
    </>
  );
}
