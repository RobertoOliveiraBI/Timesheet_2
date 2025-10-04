export interface StatusConfig {
  label: string;
  variant: 'outline' | 'secondary' | 'default' | 'destructive';
  className?: string;
}

export const getStatusConfig = (status: string): StatusConfig => {
  const statusConfigs: Record<string, StatusConfig> = {
    'RASCUNHO': { 
      label: 'Rascunho', 
      variant: 'outline' 
    },
    'SALVO': { 
      label: 'Salvo', 
      variant: 'secondary' 
    },
    'VALIDACAO': { 
      label: 'Em validação', 
      variant: 'default' 
    },
    'APROVADO': { 
      label: 'Validado', 
      variant: 'secondary', 
      className: 'bg-green-100 text-green-800 border-green-300' 
    },

  };
  
  return statusConfigs[status] || statusConfigs.RASCUNHO;
};

export const getStatusLabel = (status: string): string => {
  return getStatusConfig(status).label;
};

export interface TimeEntryWithReview {
  status: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export const needsReview = (entry: TimeEntryWithReview): boolean => {
  return entry.status === 'RASCUNHO' && (!!entry.submittedAt || !!entry.reviewedAt);
};