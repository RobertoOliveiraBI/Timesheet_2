import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Building, Target, Briefcase, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { needsReview } from "@/lib/statusUtils";

interface EntradaHoras {
  id: number;
  date: string;
  hours: string;
  description?: string;
  status: 'RASCUNHO' | 'SALVO' | 'VALIDACAO' | 'APROVADO' | 'REJEITADO';
  campaign: {
    id: number;
    name: string;
    client: {
      id: number;
      companyName: string;
      tradeName?: string;
    };
  };
  campaignTask: {
    id: number;
    description: string;
  };
  submittedAt?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

const statusConfig = {
  RASCUNHO: { label: "Rascunho", variant: "secondary" as const, color: "bg-gray-100 text-gray-800" },
  SALVO: { label: "Salvo", variant: "outline" as const, color: "bg-blue-100 text-blue-800" },
  VALIDACAO: { label: "Em Análise", variant: "default" as const, color: "bg-yellow-100 text-yellow-800" },
  APROVADO: { label: "Aprovado", variant: "default" as const, color: "bg-green-100 text-green-800" },
  REJEITADO: { label: "Rejeitado", variant: "destructive" as const, color: "bg-red-100 text-red-800" },
};

export function ListaEntradasHoras() {
  const { data: entradas = [], isLoading, error } = useQuery<EntradaHoras[]>({
    queryKey: ["/api/time-entries"],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const formatarHoras = (hours: string) => {
    const horas = parseFloat(hours);
    const horasInteiras = Math.floor(horas);
    const minutos = Math.round((horas - horasInteiras) * 60);
    
    if (minutos === 0) {
      return `${horasInteiras}h`;
    }
    return `${horasInteiras}h ${minutos}min`;
  };

  const formatarData = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-sm text-slate-500">Carregando entradas de horas...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Erro ao carregar entradas de horas
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar entradas por status
  const entradasAgrupadas = entradas.reduce((acc, entrada) => {
    const status = entrada.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(entrada);
    return acc;
  }, {} as Record<string, EntradaHoras[]>);

  // Ordenar por prioridade de status
  const ordemStatus = ['RASCUNHO', 'SALVO', 'VALIDACAO', 'APROVADO', 'REJEITADO'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Minhas Entradas de Horas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entradas.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma entrada de horas encontrada</p>
              <p className="text-sm">Comece criando sua primeira entrada de horas</p>
            </div>
          ) : (
            <div className="space-y-6">
              {ordemStatus.map(status => {
                const entradasDoStatus = entradasAgrupadas[status];
                if (!entradasDoStatus || entradasDoStatus.length === 0) return null;

                return (
                  <div key={status} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig[status as keyof typeof statusConfig].color}>
                        {statusConfig[status as keyof typeof statusConfig].label}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {entradasDoStatus.length} entrada{entradasDoStatus.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="grid gap-3">
                      {entradasDoStatus.map((entrada) => (
                        <div
                          key={entrada.id}
                          className="border rounded-lg p-4 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              {/* Linha principal */}
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  <span className="font-medium">{formatarData(entrada.date)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  <span className="font-medium">{formatarHoras(entrada.hours)}</span>
                                </div>
                                {needsReview(entrada) && (
                                  <Badge className="bg-red-100 text-red-800 border-red-200" data-testid={`badge-revisar-${entrada.id}`}>
                                    ⚠️ Revisar
                                  </Badge>
                                )}
                              </div>

                              {/* Informações do projeto */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Building className="h-4 w-4 text-slate-400" />
                                  <span>{entrada.campaign.client.tradeName || entrada.campaign.client.companyName}</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm">
                                  <Target className="h-4 w-4 text-slate-400" />
                                  <span>{entrada.campaign.name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm">
                                  <Briefcase className="h-4 w-4 text-slate-400" />
                                  <span>{entrada.campaignTask.description}</span>
                                </div>
                              </div>

                              {/* Descrição */}
                              {entrada.description && (
                                <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                                  <p className="text-slate-700">{entrada.description}</p>
                                </div>
                              )}

                              {/* Comentário de revisão */}
                              {entrada.reviewComment && (
                                <div className="mt-2 p-2 bg-orange-50 border-l-4 border-orange-200">
                                  <p className="text-sm text-orange-800">
                                    <strong>Comentário do gestor:</strong> {entrada.reviewComment}
                                  </p>
                                  {entrada.reviewedAt && (
                                    <p className="text-xs text-orange-600 mt-1">
                                      {format(new Date(entrada.reviewedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Datas de submissão */}
                              <div className="flex gap-4 text-xs text-slate-500">
                                {entrada.submittedAt && (
                                  <span>
                                    Enviado em {format(new Date(entrada.submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                )}
                                {entrada.reviewedAt && (
                                  <span>
                                    Revisado em {format(new Date(entrada.reviewedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="flex gap-2 ml-4">
                              {(entrada.status === 'RASCUNHO' || entrada.status === 'REJEITADO') && (
                                <>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}