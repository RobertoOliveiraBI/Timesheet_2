import { AlertCircle, CheckCircle, Database } from 'lucide-react';
import { useBackup } from '@/contexts/BackupContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function BackupNotificationBar() {
  const { backupStatus } = useBackup();

  if (!backupStatus.isRunning) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg">
      <div className="flex items-center justify-center p-3 space-x-3">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <Database className="w-4 h-4" />
          <span className="font-medium">Backup em andamento...</span>
        </div>
        <div className="text-blue-100">
          {backupStatus.progress}
        </div>
        <div className="text-sm text-blue-200">
          Por favor, aguarde alguns minutos
        </div>
      </div>
    </div>
  );
}