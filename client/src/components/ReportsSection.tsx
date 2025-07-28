import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users,
  Download,
  MessageCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { StatusBadge } from "./StatusBadge";
import { getStatusLabel } from "@/lib/statusUtils";

export function ReportsSection() {
  const [filters, setFilters] = useState({
    month: format(new Date(), "yyyy-MM"),
    clientId: "all",
    campaignId: "all",
    status: "all",
    userId: "all",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
  });

  // Buscar clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ["/api/clientes"],
  });

  // Buscar usuários para filtro de colaborador
  const { data: usuarios = [], isLoading: loadingUsers, error: errorUsers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) {
        console.error("Erro ao buscar usuários:", response.status, response.statusText);
        return [];
      }
      const data = await response.json();
      console.log("Usuários carregados:", data);
      return data;
    },
  });

  // Buscar campanhas baseado no cliente selecionado
  const { data: campanhas = [] } = useQuery({
    queryKey: ["/api/campanhas", filters.clientId],
    queryFn: async () => {
      if (filters.clientId === "all") {
        const response = await fetch("/api/campanhas", { credentials: "include" });
        return response.ok ? await response.json() : [];
      } else {
        const response = await fetch(`/api/clientes/${filters.clientId}/campanhas`, { credentials: "include" });
        return response.ok ? await response.json() : [];
      }
    },
  });

  // Buscar entradas filtradas com paginação
  const { data: paginatedData = { entries: [], total: 0, totalPages: 0 } } = useQuery({
    queryKey: ["/api/time-entries", filters.month, filters.clientId, filters.campaignId, filters.status, filters.userId, pagination.page, pagination.pageSize],
    queryFn: async () => {
      const [year, month] = filters.month.split("-");
      const startDate = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");
      
      let url = `/api/time-entries?fromDate=${startDate}&toDate=${endDate}`;
      
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return { entries: [], total: 0, totalPages: 0 };
      
      let entries = await response.json();
      
      // Filtrar por cliente se especificado
      if (filters.clientId !== "all") {
        entries = entries.filter((entry: any) => 
          entry.campaign?.client?.id?.toString() === filters.clientId
        );
      }
      
      // Filtrar por campanha se especificado
      if (filters.campaignId !== "all") {
        entries = entries.filter((entry: any) => 
          entry.campaign?.id?.toString() === filters.campaignId
        );
      }
      
      // Filtrar por status se especificado
      if (filters.status !== "all") {
        entries = entries.filter((entry: any) => 
          entry.status === filters.status
        );
      }

      // Filtrar por usuário se especificado
      if (filters.userId !== "all") {
        entries = entries.filter((entry: any) => 
          entry.user?.id?.toString() === filters.userId
        );
      }
      
      // Implementar paginação
      const total = entries.length;
      const totalPages = Math.ceil(total / pagination.pageSize);
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const paginatedEntries = entries.slice(startIndex, endIndex);
      
      return {
        entries: paginatedEntries,
        total,
        totalPages
      };
    },
  });

  const timeEntries = paginatedData.entries;

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalHours = timeEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.hours || 0), 0);
    const billableHours = timeEntries
      .filter((entry: any) => entry.campaignTask?.taskType?.isBillable)
      .reduce((sum: number, entry: any) => sum + parseFloat(entry.hours || 0), 0);
    const nonBillableHours = totalHours - billableHours;
    const clientesAtendidos = new Set(
      timeEntries
        .map((entry: any) => entry.campaign?.client?.id)
        .filter(Boolean)
    ).size;
    
    return {
      totalHours,
      billableHours,
      nonBillableHours,
      clientesAtendidos,
      utilization: totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0
    };
  }, [timeEntries]);

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString + 'T00:00:00'), "dd/MM/yyyy");
  };

  // Função para download CSV
  const downloadCSV = () => {
    const headers = [
      "Data",
      "Colaborador", 
      "Cliente",
      "Campanha",
      "Tarefa",
      "Horas",
      "Tipo",
      "Status",
      "Comentário do Gestor",
      "Descrição"
    ];

    const rows = timeEntries.map((entry: any) => [
      formatDate(entry.date),
      `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim(),
      entry.campaign?.client?.tradeName || entry.campaign?.client?.companyName || '',
      entry.campaign?.name || '',
      entry.campaignTask?.description || '',
      entry.hours,
      entry.campaignTask?.taskType?.isBillable ? 'Faturável' : 'Não faturável',
      getStatusLabel(entry.status),
      entry.reviewComment || '',
      entry.description || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-timesheet-${filters.month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Filtros do Relatório */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mês/Ano</label>
              <input
                type="month"
                value={filters.month}
                onChange={(e) => {
                  setFilters({ ...filters, month: e.target.value, campaignId: "all" });
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Colaborador</label>
              <Select
                value={filters.userId}
                onValueChange={(value) => {
                  setFilters({ ...filters, userId: value });
                  setPagination({ ...pagination, page: 1 });
                }}
                disabled={loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Carregando colaboradores..." : "Todos os colaboradores"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  {(usuarios as any[]).map((usuario: any) => (
                    <SelectItem key={usuario.id} value={usuario.id.toString()}>
                      {usuario.first_name || usuario.firstName} {usuario.last_name || usuario.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Cliente</label>
              <Select
                value={filters.clientId}
                onValueChange={(value) => {
                  setFilters({ ...filters, clientId: value, campaignId: "all" });
                  setPagination({ ...pagination, page: 1 });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {(clientes as any[]).map((cliente: any) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.tradeName || cliente.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Campanha</label>
              <Select
                value={filters.campaignId}
                onValueChange={(value) => {
                  setFilters({ ...filters, campaignId: value });
                  setPagination({ ...pagination, page: 1 });
                }}
                disabled={filters.clientId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={filters.clientId === "all" ? "Primeiro selecione um cliente" : "Todas as campanhas"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {campanhas.map((campanha: any) => (
                    <SelectItem key={campanha.id} value={campanha.id.toString()}>
                      {campanha.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value });
                  setPagination({ ...pagination, page: 1 });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                  <SelectItem value="SALVO">Salvo</SelectItem>
                  <SelectItem value="VALIDACAO">Em Validação</SelectItem>
                  <SelectItem value="APROVADO">Aprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total"
          value={formatHours(stats.totalHours)}
          subtitle="Horas totais"
          icon={Clock}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Faturáveis"
          value={formatHours(stats.billableHours)}
          subtitle="Horas faturáveis"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title="Não Faturáveis"
          value={formatHours(stats.nonBillableHours)}
          subtitle="Horas não faturáveis"
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
        <StatsCard
          title="Clientes"
          value={(stats.clientesAtendidos || 0).toString()}
          subtitle="Clientes atendidos"
          icon={Users}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
      </div>

      {/* Relatório Detalhado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Relatório Detalhado</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadCSV}
              disabled={timeEntries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {timeEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhum dado disponível para o período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Colaborador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Campanha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Tarefa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Horas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Comentário
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {timeEntries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {`${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.campaign?.client?.tradeName || entry.campaign?.client?.companyName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.campaign?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.campaignTask?.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                        {entry.hours}h
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          entry.campaignTask?.taskType?.isBillable
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.campaignTask?.taskType?.isBillable ? 'Faturável' : 'Não faturável'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {entry.reviewComment ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800"
                                title="Ver comentário do gestor"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Comentário do Gestor</DialogTitle>
                                <DialogDescription>
                                  Visualize o comentário feito pelo gestor sobre esta entrada de tempo.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="text-sm text-gray-600">
                                  <strong>Entrada:</strong> {formatDate(entry.date)} - {entry.hours}h
                                </div>
                                <div className="text-sm text-gray-600">
                                  <strong>Tarefa:</strong> {entry.campaignTask?.description || '-'}
                                </div>
                                <div className="bg-gray-50 p-3 rounded-md">
                                  <div className="text-sm font-medium text-gray-700 mb-2">Comentário:</div>
                                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                                    {entry.reviewComment}
                                  </div>
                                </div>
                                {entry.reviewedAt && (
                                  <div className="text-xs text-gray-500">
                                    Comentado em: {format(new Date(entry.reviewedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Controles de Paginação */}
          {paginatedData.total > pagination.pageSize && (
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} a {Math.min(pagination.page * pagination.pageSize, paginatedData.total)} de {paginatedData.total} entradas
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, paginatedData.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={pagination.page === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPagination({ ...pagination, page })}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {paginatedData.totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <Button
                        variant={pagination.page === paginatedData.totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPagination({ ...pagination, page: paginatedData.totalPages })}
                        className="w-8 h-8 p-0"
                      >
                        {paginatedData.totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === paginatedData.totalPages}
                  className="flex items-center gap-1"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}