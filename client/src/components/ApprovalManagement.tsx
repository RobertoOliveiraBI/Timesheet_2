import { useState, useMemo } from "react";
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
import { Check, X, Filter, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadge } from "./StatusBadge";

interface TimeEntry {
  id: number;
  date: string;
  hours: string;
  description: string | null;
  status: 'RASCUNHO' | 'SALVO' | 'VALIDACAO' | 'APROVADO' | 'REJEITADO';
  submittedAt: string | null;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  campaign: {
    id: number;
    name: string;
    clientId?: number;
    client: {
      id?: number;
      companyName: string;
      tradeName?: string;
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
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all-months");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [reviewComment, setReviewComment] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar entradas de tempo para validação
  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries/validation"],
    queryFn: async () => {
      const response = await fetch("/api/time-entries/validation", {
        credentials: "include"
      });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Buscar clientes
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clientes"],
    staleTime: 5 * 60 * 1000,
  });

  // Buscar campanhas
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<any[]>({
    queryKey: ["/api/campanhas"],
    queryFn: async () => {
      const response = await fetch("/api/campanhas", { credentials: "include" });
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });



  // Filtrar entradas com base nos filtros selecionados
  const filteredEntries = useMemo(() => {
    return timeEntries.filter(entry => {
      // Filtro por status (apenas VALIDACAO por padrão)
      if (entry.status !== 'VALIDACAO') return false;
      
      // Filtro por colaborador
      if (selectedCollaborator !== "all" && entry.user.id.toString() !== selectedCollaborator) {
        return false;
      }
      
      // Filtro por mês
      if (selectedMonth && selectedMonth !== "all-months" && !entry.date.startsWith(selectedMonth)) {
        return false;
      }
      
      // Filtro por cliente
      if (selectedClient !== "all" && entry.campaign.client.id?.toString() !== selectedClient) {
        return false;
      }
      
      // Filtro por campanha
      if (selectedCampaign !== "all" && entry.campaign.id.toString() !== selectedCampaign) {
        return false;
      }
      
      return true;
    });
  }, [timeEntries, selectedCollaborator, selectedMonth, selectedClient, selectedCampaign]);

  // Obter colaboradores únicos
  const collaborators = useMemo(() => {
    const unique = new Map();
    timeEntries.forEach(entry => {
      if (!unique.has(entry.user.id)) {
        unique.set(entry.user.id, {
          id: entry.user.id,
          name: `${entry.user.firstName} ${entry.user.lastName}`
        });
      }
    });
    return Array.from(unique.values());
  }, [timeEntries]);

  const approveEntry = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment?: string }) => {
      await apiRequest("PATCH", `/api/time-entries/${id}`, {
        status: "APROVADO",
        reviewComment: comment,
        reviewedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Entrada aprovada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation"] });
      setSelectedEntry(null);
      setReviewComment("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao aprovar entrada",
        variant: "destructive",
      });
    },
  });

  const rejectEntry = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment?: string }) => {
      await apiRequest("PATCH", `/api/time-entries/${id}`, {
        status: "RASCUNHO",
        reviewComment: comment,
        reviewedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso", 
        description: "Entrada retornada para rascunho!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation"] });
      setSelectedEntry(null);
      setReviewComment("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao rejeitar entrada",
        variant: "destructive",
      });
    },
  });

  const batchApprove = useMutation({
    mutationFn: async () => {
      await Promise.all(
        filteredEntries.map(entry => 
          apiRequest("PATCH", `/api/time-entries/${entry.id}`, {
            status: "APROVADO",
            reviewedAt: new Date().toISOString(),
          })
        )
      );
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: `${filteredEntries.length} entrada(s) aprovada(s) em lote!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao processar entradas em lote",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatHours = (hours: string) => {
    return `${hours}h`;
  };

  // Gerar opções de mês (últimos 12 meses)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: ptBR });
      options.push({ value, label });
    }
    return options;
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Gestão de Validações
          </CardTitle>
          <CardDescription>
            Valide as entradas de timesheet da sua equipe - {filteredEntries.length} entrada(s) aguardando validação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-2 block">Colaborador</label>
              <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  {collaborators.map(collab => (
                    <SelectItem key={collab.id} value={collab.id.toString()}>
                      {collab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Mês</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-months">Todos os meses</SelectItem>
                  {monthOptions.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.tradeName || client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Campanha</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {campaigns
                    .filter(campaign => selectedClient === "all" || campaign.clientId?.toString() === selectedClient)
                    .map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              {filteredEntries.length > 0 && (
                <Button
                  onClick={() => batchApprove.mutate()}
                  disabled={batchApprove.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {batchApprove.isPending ? "Aprovando..." : `Aprovar Todos (${filteredEntries.length})`}
                </Button>
              )}
            </div>
          </div>

          {/* Tabela de entradas */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Filter className="h-8 w-8 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma entrada encontrada com os filtros selecionados</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.user.firstName} {entry.user.lastName}</div>
                          <div className="text-sm text-gray-500">{entry.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{entry.campaign.client.companyName}</TableCell>
                      <TableCell>{entry.campaign.name}</TableCell>
                      <TableCell>
                        {entry.campaignTask.description}
                        <Badge 
                          variant={entry.campaignTask.taskType.isBillable ? "default" : "secondary"}
                          className="ml-2 text-xs"
                        >
                          {entry.campaignTask.taskType.isBillable ? "Faturável" : "Não faturável"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatHours(entry.hours)}</TableCell>
                      <TableCell>
                        <StatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={() => approveEntry.mutate({ id: entry.id })}
                            disabled={approveEntry.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setSelectedEntry(entry)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Retornar para Rascunho</DialogTitle>
                                <DialogDescription>
                                  Esta entrada será retornada para rascunho para que o colaborador possa fazer correções. Adicione um comentário explicando o motivo.
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea
                                placeholder="Motivo da devolução (opcional)"
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                              />
                              <DialogFooter>
                                <Button variant="outline" onClick={() => {
                                  setSelectedEntry(null);
                                  setReviewComment("");
                                }}>
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => rejectEntry.mutate({ 
                                    id: selectedEntry!.id, 
                                    comment: reviewComment 
                                  })}
                                  disabled={rejectEntry.isPending}
                                >
                                  {rejectEntry.isPending ? "Devolvendo..." : "Devolver"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}