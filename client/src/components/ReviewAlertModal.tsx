import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { needsReview } from "@/lib/statusUtils";

interface TimeEntry {
  id: number;
  date: string;
  hours: string;
  status: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  clienteNome?: string;
  campanhaNome?: string;
  tarefaNome?: string;
}

export function ReviewAlertModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownAlert, setHasShownAlert] = useState(false);

  // Buscar lançamentos do usuário
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries/user'],
  });

  // Filtrar lançamentos que precisam de revisão
  const entriesToReview = timeEntries.filter(entry => needsReview(entry));

  useEffect(() => {
    // Mostrar modal apenas uma vez por sessão e se houver lançamentos para revisar
    if (entriesToReview.length > 0 && !hasShownAlert) {
      // Pequeno delay para melhor UX após o login
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasShownAlert(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [entriesToReview.length, hasShownAlert]);

  if (entriesToReview.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            Atenção: Lançamentos Precisam de Revisão
          </DialogTitle>
          <DialogDescription>
            Você tem {entriesToReview.length} {entriesToReview.length === 1 ? 'lançamento que precisa' : 'lançamentos que precisam'} ser revisado{entriesToReview.length === 1 ? '' : 's'} e reenviado{entriesToReview.length === 1 ? '' : 's'} para aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  {entriesToReview.length === 1 
                    ? 'O gestor rejeitou um lançamento e pediu para você revisar:'
                    : 'O gestor rejeitou alguns lançamentos e pediu para você revisar:'
                  }
                </p>
                <p className="text-sm text-red-700">
                  Por favor, revise {entriesToReview.length === 1 ? 'o lançamento abaixo' : 'os lançamentos abaixo'}, faça os ajustes necessários e reenvie para aprovação.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Lançamentos Pendentes de Revisão:
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {entriesToReview.map((entry) => (
                <div 
                  key={entry.id} 
                  className="border border-red-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                  data-testid={`review-alert-entry-${entry.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Revisar
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.date + 'T00:00:00'), "dd/MM/yyyy")}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {entry.hours}h
                        </span>
                      </div>

                      <div className="text-sm space-y-1">
                        <p className="text-gray-700">
                          <span className="font-medium">Cliente:</span> {entry.clienteNome}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Campanha:</span> {entry.campanhaNome}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Tarefa:</span> {entry.tarefaNome}
                        </p>
                      </div>

                      {entry.reviewComment && (
                        <div className="mt-2 p-2 bg-orange-50 border-l-3 border-orange-400 rounded text-xs">
                          <div className="flex items-start gap-2">
                            <MessageCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-orange-800 mb-1">Mensagem do Gestor:</p>
                              <p className="text-orange-700 whitespace-pre-wrap">{entry.reviewComment}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <p className="text-sm text-blue-800">
              💡 <strong>Dica:</strong> Vá para a seção "Timesheet" para editar e reenviar seus lançamentos.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              onClick={() => setIsOpen(false)}
              className="w-full"
              data-testid="button-entendi-revisar"
            >
              Entendi, vou revisar agora
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
