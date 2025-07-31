import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  DollarSign,
  Building,
  Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CampaignCostsModule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Função para obter mês atual no formato YYYY-MM
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };
  
  // Estados locais
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("ATIVO");
  const [showForm, setShowForm] = useState(false);
  const [editingCost, setEditingCost] = useState<any>(null);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    client_id: "",
    campaign_id: "",
    subject: "",
    description: "",
    reference_month: getCurrentMonth(),
    amount: "",
    status: "ATIVO" as "ATIVO" | "INATIVO"
  });

  // Query para buscar custos de campanha
  const { data: costs = [], isLoading, error } = useQuery({
    queryKey: ["/api/campaign-costs"],
    queryFn: async () => {
      const response = await fetch("/api/campaign-costs", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Erro ao carregar custos");
      return response.json();
    }
  });

  // Query para buscar totais
  const { data: totals } = useQuery({
    queryKey: ["/api/campaign-costs", "totals"],
    queryFn: async () => {
      const response = await fetch("/api/campaign-costs/totals", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Erro ao carregar totais");
      return response.json();
    }
  });

  // Query para buscar clientes
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clientes"],
    queryFn: async () => {
      const response = await fetch("/api/clientes", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Erro ao carregar clientes");  
      return response.json();
    }
  });

  // Query para buscar campanhas do cliente selecionado
  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campanhas", formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return [];
      const response = await fetch(`/api/campanhas?client_id=${formData.client_id}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Erro ao carregar campanhas");
      return response.json();
    },
    enabled: !!formData.client_id && showForm
  });

  // Mutação para criar/atualizar custo  
  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingCost 
        ? `/api/campaign-costs/${editingCost.id}`
        : "/api/campaign-costs";
      
      const method = editingCost ? "PATCH" : "POST";
      
      console.log("Mutation data:", { method, url, data, editingCost });
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Mutation error:", error);
        throw new Error(error.message || "Erro ao salvar custo");
      }
      
      const result = await response.json();
      console.log("Mutation response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Mutation success:", data);
      toast({
        title: "Sucesso",
        description: editingCost ? "Custo atualizado!" : "Custo criado!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-costs", "totals"] });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutação para inativar/reativar custo
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "inactivate" | "reactivate" }) => {
      const response = await fetch(`/api/campaign-costs/${id}/${action}`, {
        method: "PATCH",
        credentials: "include"
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao alterar status");
      }
      
      return response.json();
    },
    onSuccess: (_, { action }) => {
      toast({
        title: "Sucesso",
        description: action === "inactivate" ? "Custo inativado!" : "Custo reativado!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-costs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      client_id: "",
      campaign_id: "",
      subject: "",
      description: "",
      reference_month: getCurrentMonth(),
      amount: "",
      status: "ATIVO"
    });
    setEditingCost(null);
    setShowForm(false);
  };

  const handleEdit = (cost: any) => {
    setEditingCost(cost);
    setFormData({
      client_id: cost.campaign?.clientId ? cost.campaign.clientId.toString() : "",
      campaign_id: cost.campaignId ? cost.campaignId.toString() : "",
      subject: cost.subject || "",
      description: cost.description || "",
      reference_month: cost.referenceMonth || "",
      amount: cost.amount ? cost.amount.toString() : "",
      status: cost.status || "ATIVO"
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.client_id || !formData.campaign_id || !formData.subject || 
        !formData.reference_month || !formData.amount) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Converte o valor para número
    const amount = parseFloat(formData.amount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido",
        variant: "destructive"
      });
      return;
    }

    createOrUpdateMutation.mutate({
      campaignId: parseInt(formData.campaign_id),
      subject: formData.subject,
      description: formData.description,
      referenceMonth: formData.reference_month,
      amount,
      status: formData.status
    });
  };

  // Filtrar custos
  const filteredCosts = costs.filter((cost: any) => {
    const matchesSearch = !searchTerm || 
      cost.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cost.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cost.campaign?.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cost.campaign?.client?.tradeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cost.campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMonth = selectedMonth === "all" || cost.referenceMonth === selectedMonth;
    const matchesClient = selectedClient === "all" || cost.campaign?.clientId?.toString() === selectedClient;
    const matchesStatus = selectedStatus === "all" || cost.status === selectedStatus;
    
    return matchesSearch && matchesMonth && matchesClient && matchesStatus;
  });

  // Gerar opções de mês
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = -6; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("pt-BR", { 
        month: "long", 
        year: "numeric" 
      });
      
      options.push({ value: monthYear, label: monthName });
    }
    
    return options;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando custos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Erro ao Carregar</h2>
          <p className="text-slate-600">Não foi possível carregar os custos de campanha.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Custos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totals?.total?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma de todos os custos ativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos Ativos</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Custos com status ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos Inativos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals?.inactive || 0}</div>
            <p className="text-xs text-muted-foreground">
              Custos com status inativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista e Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <CardTitle>Custos de Campanha</CardTitle>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Custo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por assunto, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {generateMonthOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.companyName || client.tradeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVO">Somente Ativos</SelectItem>
                <SelectItem value="INATIVO">Somente Inativos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setSelectedMonth("all");
                setSelectedClient("all");
                setSelectedStatus("ATIVO");
              }}
            >
              Limpar Filtros
            </Button>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {costs.length === 0 ? "Nenhum custo cadastrado" : "Nenhum custo encontrado com os filtros aplicados"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCosts.map((cost: any) => (
                    <TableRow key={cost.id}>
                      <TableCell className="font-medium">
                        {cost.campaign?.client?.companyName || cost.campaign?.client?.tradeName || "N/A"}
                      </TableCell>
                      <TableCell>{cost.campaign?.name || "N/A"}</TableCell>
                      <TableCell>{cost.subject}</TableCell>
                      <TableCell className="max-w-xs truncate" title={cost.description}>
                        {cost.description || "-"}
                      </TableCell>
                      <TableCell>
                        {cost.referenceMonth ? new Date(cost.referenceMonth + "-01T00:00:00").toLocaleDateString("pt-BR", {
                          month: "long",
                          year: "numeric"
                        }) : "N/A"}
                      </TableCell>
                      <TableCell className="font-mono">
                        R$ {parseFloat(cost.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cost.status === "ATIVO" ? "default" : "secondary"}>
                          {cost.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cost.user?.firstName || cost.user?.email || "N/A"} {cost.user?.lastName || ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(cost)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={cost.status === "ATIVO" ? "destructive" : "default"}
                            onClick={() => 
                              toggleStatusMutation.mutate({
                                id: cost.id,
                                action: cost.status === "ATIVO" ? "inactivate" : "reactivate"
                              })
                            }
                          >
                            {cost.status === "ATIVO" ? (
                              <Trash2 className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Formulário Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? "Editar Custo" : "Novo Custo"}
            </DialogTitle>

          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cliente *
                </label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, client_id: value, campaign_id: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.companyName || client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Campanha *
                </label>
                <Select 
                  value={formData.campaign_id} 
                  onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign: any) => (
                      <SelectItem key={campaign.id} value={campaign.id.toString()}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Assunto *
                </label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Digite o assunto do custo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mês de Referência *
                </label>
                <Select 
                  value={formData.reference_month} 
                  onValueChange={(value) => setFormData({ ...formData, reference_month: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Valor *
                </label>
                <Input
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                  type="text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Status
                </label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: "ATIVO" | "INATIVO") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="INATIVO">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Descrição
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição detalhada do custo (opcional)"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createOrUpdateMutation.isPending}
              >
                {createOrUpdateMutation.isPending 
                  ? "Salvando..." 
                  : editingCost 
                    ? "Atualizar" 
                    : "Criar"
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignCostsModule;