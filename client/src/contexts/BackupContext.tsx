import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BackupStatus {
  isRunning: boolean;
  progress: string;
  lastBackupDate?: string;
}

interface BackupContextType {
  backupStatus: BackupStatus;
  setBackupStatus: (status: BackupStatus) => void;
  startBackup: () => void;
  finishBackup: (lastBackupDate?: string) => void;
}

const BackupContext = createContext<BackupContextType | undefined>(undefined);

export function BackupProvider({ children }: { children: ReactNode }) {
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    isRunning: false,
    progress: '',
    lastBackupDate: undefined,
  });

  const startBackup = () => {
    setBackupStatus({
      isRunning: true,
      progress: 'Iniciando backup...',
      lastBackupDate: backupStatus.lastBackupDate,
    });
  };

  const finishBackup = (lastBackupDate?: string) => {
    setBackupStatus({
      isRunning: false,
      progress: '',
      lastBackupDate: lastBackupDate || new Date().toISOString(),
    });
  };

  return (
    <BackupContext.Provider value={{
      backupStatus,
      setBackupStatus,
      startBackup,
      finishBackup,
    }}>
      {children}
    </BackupContext.Provider>
  );
}

export function useBackup() {
  const context = useContext(BackupContext);
  if (context === undefined) {
    throw new Error('useBackup deve ser usado dentro de um BackupProvider');
  }
  return context;
}