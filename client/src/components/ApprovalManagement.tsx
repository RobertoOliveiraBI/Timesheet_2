import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, Filter, CheckCircle2, Edit, Save, RotateCcw, Trash2 } from "lucide-react";
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
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  
  // Filtros para aba de aprovados - com mês atual como padrão
  const [approvedFilters, setApprovedFilters] = useState({
    collaborator: "all",
    month: format(new Date(), "yyyy-MM"),
    client: "all",
    campaign: "all",
  });
  
  // Paginação para aprovados
  const [approvedPagination, setApprovedPagination] = useState({
    page: 1,
    pageSize: 50,
  });
  
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

  // Buscar entradas de tempo aprovadas com filtros
  const { data: approvedData = { entries: [], total: 0, totalPages: 0 }, isLoading: loadingApproved } = useQuery({
    queryKey: ["/api/time-entries/approved", approvedFilters, approvedPagination],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Adicionar filtros
      if (approvedFilters.month !== "all-months") {
        const [year, month] = approvedFilters.month.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
        params.append("fromDate", startDate);
        params.append("toDate", endDate);
      }
      
      if (approvedFilters.collaborator !== "all") {
        params.append("userId", approvedFilters.collaborator);
      }
      
      // Paginação
      params.append("page", approvedPagination.page.toString());
      params.append("pageSize", approvedPagination.pageSize.toString());
      
      const response = await fetch(`/api/time-entries/approved?${params}`, {
        credentials: "include"
      });
      
      if (!response.ok) return { entries: [], total: 0, totalPages: 0 };
      
      let entries = await response.json();
      
      // Aplicar filtros de cliente e campanha no frontend
      if (approvedFilters.client !== "all") {
        entries = entries.filter((entry: any) => 
          entry.campaign?.client?.id?.toString() === approvedFilters.client
        );
      }
      
      if (approvedFilters.campaign !== "all") {
        entries = entries.filter((entry: any) => 
          entry.campaign?.id?.toString() === approvedFilters.campaign
        );
      }
      
      // Calcular paginação manual para filtros de cliente/campanha
      const total = entries.length;
      const totalPages = Math.ceil(total / approvedPagination.pageSize);
      const startIndex = (approvedPagination.page - 1) * approvedPagination.pageSize;
      const paginatedEntries = entries.slice(startIndex, startIndex + approvedPagination.pageSize);
      
      return {
        entries: paginatedEntries,
        total,
        totalPages
      };
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

  // Filtrar campanhas baseado no cliente selecionado (para aprovados)
  const filteredCampaignsForApproved = useMemo(() => {
    if (approvedFilters.client === "all") return campaigns;
    return campaigns.filter((campaign: any) => 
      campaign.clientId?.toString() === approvedFilters.client
    );
  }, [campaigns, approvedFilters.client]);

  // Buscar todos os usuários para filtros
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        credentials: "include"
      });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Obter todos os colaboradores (usuários com role COLABORADOR)
  const collaborators = useMemo(() => {
    return allUsers.filter(user => user.role === 'COLABORADOR').map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName
    }));
  }, [allUsers]);

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

  // Mutation para editar lançamento aprovado
  const editApprovedEntry = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/time-entries/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento editado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/approved"] });
      setEditingEntry(null);
      setEditData({});
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao editar lançamento",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry.id);
    setEditData({
      hours: entry.hours,
      description: entry.description || "",
    });
  };

  const handleSaveEdit = (entryId: number) => {
    editApprovedEntry.mutate({ id: entryId, data: editData });
  };

  // Mutation para retornar aprovado para SALVO
  const returnToSaved = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment?: string }) => {
      return apiRequest("PATCH", `/api/time-entries/approved/${id}/return-to-saved`, {
        comment
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento retornado para 'Salvo' com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/approved"] });
      setSelectedEntry(null);
      setReviewComment("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao retornar lançamento para 'Salvo'",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir lançamento aprovado
  const deleteApprovedEntry = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/time-entries/approved/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/approved"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir lançamento",
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
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Pendentes de Validação
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Lançamentos Aprovados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6 mt-6">
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
                      {collab.firstName} {collab.lastName}
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
        </TabsContent>

        <TabsContent value="approved" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Lançamentos Aprovados
              </CardTitle>
              <CardDescription>
                Edite lançamentos já aprovados da sua equipe - {approvedData.total} entrada(s) aprovadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros para aprovados */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colaborador
                  </label>
                  <Select 
                    value={approvedFilters.collaborator} 
                    onValueChange={(value) => {
                      setApprovedFilters(prev => ({ ...prev, collaborator: value }));
                      setApprovedPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os colaboradores</SelectItem>
                      {collaborators.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mês de Referência
                  </label>
                  <Select 
                    value={approvedFilters.month} 
                    onValueChange={(value) => {
                      setApprovedFilters(prev => ({ ...prev, month: value }));
                      setApprovedPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-months">Todos os meses</SelectItem>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <Select 
                    value={approvedFilters.client} 
                    onValueChange={(value) => {
                      setApprovedFilters(prev => ({ 
                        ...prev, 
                        client: value,
                        campaign: "all" // Reset campaign when client changes
                      }));
                      setApprovedPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campanha
                  </label>
                  <Select 
                    value={approvedFilters.campaign} 
                    onValueChange={(value) => {
                      setApprovedFilters(prev => ({ ...prev, campaign: value }));
                      setApprovedPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as campanhas</SelectItem>
                      {filteredCampaignsForApproved.map((campaign: any) => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadingApproved ? (
                <div className="text-center py-8">Carregando lançamentos aprovados...</div>
              ) : approvedData.entries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum lançamento aprovado encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Tarefa</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedData.entries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell>{entry.user.firstName} {entry.user.lastName}</TableCell>
                        <TableCell>{entry.campaign.client.companyName}</TableCell>
                        <TableCell>{entry.campaign.name}</TableCell>
                        <TableCell>{entry.campaignTask.description}</TableCell>
                        <TableCell>
                          {editingEntry === entry.id ? (
                            <input
                              type="text"
                              value={editData.hours || ""}
                              onChange={(e) => setEditData({ ...editData, hours: e.target.value })}
                              className="w-16 px-2 py-1 border rounded"
                            />
                          ) : (
                            formatHours(entry.hours)
                          )}
                        </TableCell>
                        <TableCell>
                          {editingEntry === entry.id ? (
                            <textarea
                              value={editData.description || ""}
                              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                              className="w-full px-2 py-1 border rounded resize-none"
                              rows={2}
                            />
                          ) : (
                            entry.description || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={entry.status} />
                        </TableCell>
                        <TableCell>
                          {editingEntry === entry.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(entry.id)}
                                disabled={editApprovedEntry.isPending}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingEntry(null);
                                  setEditData({});
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(entry)}
                                title="Editar lançamento"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-600 hover:text-orange-700"
                                    onClick={() => setSelectedEntry(entry)}
                                    title="Retornar para SALVO"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Retornar para SALVO</DialogTitle>
                                    <DialogDescription>
                                      Este lançamento será alterado para status "SALVO" para que o colaborador possa visualizar e atualizar se necessário. Adicione um comentário explicando o motivo.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <Textarea
                                    placeholder="Motivo da alteração (opcional)"
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
                                      className="bg-orange-600 hover:bg-orange-700"
                                      onClick={() => returnToSaved.mutate({ 
                                        id: selectedEntry!.id, 
                                        comment: reviewComment 
                                      })}
                                      disabled={returnToSaved.isPending}
                                    >
                                      {returnToSaved.isPending ? "Alterando..." : "Retornar para SALVO"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    title="Excluir lançamento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                                    <DialogDescription>
                                      Tem certeza que deseja excluir este lançamento aprovado? Esta ação não pode ser desfeita.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button variant="outline">
                                      Cancelar
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => deleteApprovedEntry.mutate(entry.id)}
                                      disabled={deleteApprovedEntry.isPending}
                                    >
                                      {deleteApprovedEntry.isPending ? "Excluindo..." : "Excluir"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Paginação para aprovados */}
              {approvedData.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Mostrando {((approvedPagination.page - 1) * approvedPagination.pageSize) + 1}-{Math.min(approvedPagination.page * approvedPagination.pageSize, approvedData.total)} de {approvedData.total} entradas
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApprovedPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={approvedPagination.page === 1}
                    >
                      Anterior
                    </Button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, approvedData.totalPages) }, (_, i) => {
                        let pageNumber;
                        if (approvedData.totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (approvedPagination.page <= 3) {
                          pageNumber = i + 1;
                        } else if (approvedPagination.page >= approvedData.totalPages - 2) {
                          pageNumber = approvedData.totalPages - 4 + i;
                        } else {
                          pageNumber = approvedPagination.page - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={approvedPagination.page === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => setApprovedPagination(prev => ({ ...prev, page: pageNumber }))}
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApprovedPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={approvedPagination.page === approvedData.totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}