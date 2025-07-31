import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  DollarSign, 
  TrendingUp, 
  Building, 
  Target,
  Download,
  Search,
  Filter
} from "lucide-react";

interface CampaignCostsReportSectionProps {
  filters: {
    month: string;
    clientId: string;
    campaignId: string;
    status: string;
    searchTerm: string;
  };
  setFilters: (filters: any) => void;
  clientes: any[];
  campanhas: any[];
}

export function CampaignCostsReportSection({ 
  filters, 
  setFilters, 
  clientes, 
  campanhas 
}: CampaignCostsReportSectionProps) {
  
  // Buscar TODOS os clientes para o filtro (independente do filtro principal de relatórios)
  const { data: allClientes = [] } = useQuery({
    queryKey: ["/api/clientes"],
    queryFn: async () => {
      const response = await fetch("/api/clientes", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Buscar TODAS as campanhas para filtro
  const { data: allCampaigns = [] } = useQuery({
    queryKey: ["/api/campanhas"],
    queryFn: async () => {
      const response = await fetch("/api/campanhas", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
  });
  
  // Buscar custos de campanha
  const { data: campaignCosts = [], isLoading } = useQuery({
    queryKey: ["/api/campaign-costs"],
    queryFn: async () => {
      const response = await fetch("/api/campaign-costs", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Gerar opções de mês
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = format(date, "yyyy-MM");
      const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
      options.push({ value, label });
    }
    
    return options;
  };

  // Campanhas filtradas por cliente
  const filteredCampaigns = useMemo(() => {
    if (filters.clientId === "all") return allCampaigns;
    return allCampaigns.filter((campaign: any) => 
      campaign.clientId?.toString() === filters.clientId
    );
  }, [allCampaigns, filters.clientId]);

  // Filtrar custos
  const filteredCosts = useMemo(() => {
    return campaignCosts.filter((cost: any) => {
      const matchesSearch = !filters.searchTerm || 
        cost.subject?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        cost.description?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        cost.campaign?.client?.companyName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        cost.campaign?.client?.tradeName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        cost.campaign?.name?.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      const matchesMonth = filters.month === "all" || cost.referenceMonth === filters.month;
      const matchesClient = filters.clientId === "all" || cost.campaign?.clientId?.toString() === filters.clientId;
      const matchesCampaign = filters.campaignId === "all" || cost.campaignId?.toString() === filters.campaignId;
      const matchesStatus = filters.status === "all" || cost.status === filters.status;
      
      return matchesSearch && matchesMonth && matchesClient && matchesCampaign && matchesStatus;
    });
  }, [campaignCosts, filters]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalValue = filteredCosts.reduce((sum: number, cost: any) => sum + parseFloat(cost.amount || 0), 0);
    const activeCosts = filteredCosts.filter((cost: any) => cost.status === "ATIVO").length;
    const uniqueCampaigns = new Set(filteredCosts.map((cost: any) => cost.campaignId)).size;
    const uniqueClients = new Set(filteredCosts.map((cost: any) => cost.campaign?.clientId)).size;

    return {
      totalValue,
      totalCosts: filteredCosts.length,
      activeCosts,
      uniqueCampaigns,
      uniqueClients
    };
  }, [filteredCosts]);

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      month: format(new Date(), "yyyy-MM"),
      clientId: "all",
      campaignId: "all", 
      status: "all",
      searchTerm: "",
    });
  };

  // Download CSV
  const downloadCSV = () => {
    if (filteredCosts.length === 0) return;

    const headers = [
      "Cliente",
      "Campanha", 
      "Assunto",
      "Descrição",
      "Mês Referência",
      "Valor",
      "Status",
      "Autor"
    ];

    const csvData = filteredCosts.map((cost: any) => [
      cost.campaign?.client?.companyName || cost.campaign?.client?.tradeName || "N/A",
      cost.campaign?.name || "N/A",
      cost.subject || "",
      cost.description || "",
      cost.referenceMonth ? format(new Date(cost.referenceMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR }) : "N/A",
      `R$ ${parseFloat(cost.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      cost.status || "",
      `${cost.user?.firstName || cost.user?.email || "N/A"} ${cost.user?.lastName || ""}`.trim()
    ]);

    const csvContent = [headers, ...csvData]
      .map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-custos-campanha-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando relatório de custos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCosts} custos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCosts}</div>
            <p className="text-xs text-muted-foreground">
              custos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              campanhas diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueClients}</div>
            <p className="text-xs text-muted-foreground">
              clientes atendidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Custo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.totalCosts > 0 ? (stats.totalValue / stats.totalCosts).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
            </div>
            <p className="text-xs text-muted-foreground">
              valor médio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Relatório */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Relatório de Custos de Campanha
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadCSV}
              disabled={filteredCosts.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.month} onValueChange={(value) => setFilters({ ...filters, month: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Mês" />
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

            <Select value={filters.clientId} onValueChange={(value) => setFilters({ ...filters, clientId: value, campaignId: "all" })}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {allClientes.map((client: any) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.companyName || client.tradeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.campaignId} onValueChange={(value) => setFilters({ ...filters, campaignId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {filteredCampaigns.map((campaign: any) => (
                  <SelectItem key={campaign.id} value={campaign.id.toString()}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters} className="w-full">
              Limpar Filtros
            </Button>
          </div>

          {/* Tabela de Relatório */}
          {filteredCosts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {campaignCosts.length === 0 ? "Nenhum custo cadastrado no sistema." : "Nenhum custo encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Campanha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Assunto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Mês
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Autor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredCosts.map((cost: any) => (
                    <tr key={cost.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {cost.campaign?.client?.companyName || cost.campaign?.client?.tradeName || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {cost.campaign?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {cost.subject}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 max-w-xs truncate" title={cost.description}>
                        {cost.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {cost.referenceMonth ? format(new Date(cost.referenceMonth + "-01T00:00:00"), "MMM/yyyy", { locale: ptBR }) : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                        R$ {parseFloat(cost.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={cost.status === "ATIVO" ? "default" : "secondary"}>
                          {cost.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {cost.user?.firstName || cost.user?.email || "N/A"} {cost.user?.lastName || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}