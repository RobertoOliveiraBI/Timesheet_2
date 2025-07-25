import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, Eye, MessageSquare } from "lucide-react";

interface TimeEntry {
  id: number;
  date: string;
  hours: string;
  description: string;
  status: 'RASCUNHO' | 'SALVO' | 'VALIDACAO' | 'APROVADO' | 'REJEITADO';
  submittedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  campaign: {
    id: number;
    name: string;
    client: {
      companyName: string;
    };
  };
  campaignTask: {
    description: string;
    taskType: {
      name: string;
      isBillable: boolean;
    };
  };
}

export function ApprovalManagement() {
  const [selectedStatus, setSelectedStatus] = useState<string>("VALIDACAO");
  const [reviewComment, setReviewComment] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", { status: selectedStatus }],
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  const approveEntry = useMutation({
    mutationFn: async ({ id, status, comment }: { id: number; status: 'APROVADO' | 'REJEITADO'; comment?: string }) => {
      await apiRequest("PATCH", `/api/time-entries/${id}`, {
        status,
        reviewComment: comment,
        reviewedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Status da entrada atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      setSelectedEntry(null);
      setReviewComment("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status da entrada",
        variant: "destructive",
      });
    },
  });

  const batchApprove = useMutation({
    mutationFn: async ({ entries, status }: { entries: number[]; status: 'APROVADO' | 'REJEITADO' }) => {
      await Promise.all(
        entries.map(id => 
          apiRequest("PATCH", `/api/time-entries/${id}`, {
            status,
            reviewedAt: new Date().toISOString(),
          })
        )
      );
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Entradas processadas em lote com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao processar entradas em lote",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'RASCUNHO': { label: 'Rascunho', variant: 'outline' as const },
      'SALVO': { label: 'Salvo', variant: 'secondary' as const },
      'VALIDACAO': { label: 'Em Validação', variant: 'default' as const },
      'APROVADO': { label: 'Aprovado', variant: 'secondary' as const, className: 'bg-green-100 text-green-800 border-green-300' },
      'REJEITADO': { label: 'Rejeitado', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.RASCUNHO;
    return (
      <Badge 
        variant={config.variant} 
        className={'className' in config ? config.className : undefined}
      >
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const groupedEntries = timeEntries.reduce((acc, entry) => {
    const key = `${entry.user.firstName} ${entry.user.lastName}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Aprovações</CardTitle>
          <CardDescription>
            Gerencie e aprove as entradas de timesheet da sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VALIDACAO">Em Validação</SelectItem>
                  <SelectItem value="APROVADO">Aprovados</SelectItem>
                  <SelectItem value="REJEITADO">Rejeitados</SelectItem>
                  <SelectItem value="SALVO">Salvos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedStatus === 'VALIDACAO' && timeEntries.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  onClick={() => batchApprove.mutate({ 
                    entries: timeEntries.map(e => e.id), 
                    status: 'APROVADO' 
                  })}
                  disabled={batchApprove.isPending}
                  size="sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aprovar Todas
                </Button>
                <Button
                  onClick={() => batchApprove.mutate({ 
                    entries: timeEntries.map(e => e.id), 
                    status: 'REJEITADO' 
                  })}
                  disabled={batchApprove.isPending}
                  variant="destructive"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rejeitar Todas
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center p-8">Carregando...</div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              Nenhuma entrada encontrada para o status selecionado
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEntries).map(([userName, userEntries]) => (
                <Card key={userName}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{userName}</CardTitle>
                    <CardDescription>
                      {userEntries.length} entrada(s) • Total: {
                        userEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0).toFixed(1)
                      }h
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Campanha</TableHead>
                          <TableHead>Tarefa</TableHead>
                          <TableHead>Horas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{formatDate(entry.date)}</TableCell>
                            <TableCell>{entry.campaign.client.companyName}</TableCell>
                            <TableCell>{entry.campaign.name}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{entry.campaignTask.description}</div>
                                <div className="text-sm text-slate-500">
                                  {entry.campaignTask.taskType.name}
                                  {entry.campaignTask.taskType.isBillable && (
                                    <Badge variant="outline" className="ml-2 text-xs">Faturável</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{entry.hours}h</TableCell>
                            <TableCell>{getStatusBadge(entry.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedEntry(entry)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Detalhes da Entrada</DialogTitle>
                                      <DialogDescription>
                                        {entry.description}
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    {selectedStatus === 'VALIDACAO' && (
                                      <div className="space-y-4">
                                        <div>
                                          <label className="text-sm font-medium">Comentário da revisão (opcional)</label>
                                          <Textarea
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            placeholder="Adicione um comentário sobre a aprovação/rejeição..."
                                            className="mt-1"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    
                                    <DialogFooter>
                                      {selectedStatus === 'VALIDACAO' ? (
                                        <div className="flex space-x-2">
                                          <Button
                                            onClick={() => approveEntry.mutate({
                                              id: entry.id,
                                              status: 'APROVADO',
                                              comment: reviewComment
                                            })}
                                            disabled={approveEntry.isPending}
                                          >
                                            <Check className="w-4 h-4 mr-2" />
                                            Aprovar
                                          </Button>
                                          <Button
                                            onClick={() => approveEntry.mutate({
                                              id: entry.id,
                                              status: 'REJEITADO',
                                              comment: reviewComment
                                            })}
                                            disabled={approveEntry.isPending}
                                            variant="destructive"
                                          >
                                            <X className="w-4 h-4 mr-2" />
                                            Rejeitar
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button variant="outline">Fechar</Button>
                                      )}
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                
                                {selectedStatus === 'VALIDACAO' && (
                                  <>
                                    <Button
                                      onClick={() => approveEntry.mutate({
                                        id: entry.id,
                                        status: 'APROVADO'
                                      })}
                                      disabled={approveEntry.isPending}
                                      size="sm"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      onClick={() => approveEntry.mutate({
                                        id: entry.id,
                                        status: 'REJEITADO'
                                      })}
                                      disabled={approveEntry.isPending}
                                      variant="destructive"
                                      size="sm"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}