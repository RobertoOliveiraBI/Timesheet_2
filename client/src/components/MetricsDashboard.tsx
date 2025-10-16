import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Building2, 
  Briefcase, 
  FileText,
  Clock,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ScatterChart,
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { queryClient } from "@/lib/queryClient";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function MetricsDashboard() {
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString();

  const [filters, setFilters] = useState({
    month: currentMonth,
    year: currentYear.toString(),
    clientId: 'all',
    campaignId: 'all',
    userId: 'all',
    taskTypeId: 'all',
  });

  // Buscar clientes
  const { data: clientes = [] } = useQuery<any[]>({
    queryKey: ["/api/clientes"],
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

  // Buscar usuários
  const { data: usuarios = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Buscar tipos de tarefa
  const { data: taskTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
  });

  // Buscar métricas do dashboard
  const { data: metricsData, isLoading, refetch } = useQuery({
    queryKey: [
      "/api/metrics/dashboard", 
      filters.month, 
      filters.year, 
      filters.clientId, 
      filters.campaignId, 
      filters.userId,
      filters.taskTypeId
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.clientId !== 'all') params.append('clientId', filters.clientId);
      if (filters.campaignId !== 'all') params.append('campaignId', filters.campaignId);
      if (filters.userId !== 'all') params.append('userId', filters.userId);
      if (filters.taskTypeId !== 'all') params.append('taskTypeId', filters.taskTypeId);

      const response = await fetch(`/api/metrics/dashboard?${params.toString()}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Erro ao buscar métricas");
      return await response.json();
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/metrics/dashboard"] });
    refetch();
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')} h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  const summary = metricsData?.summary || {};
  const charts = metricsData?.charts || {};
  const tableData = metricsData?.table || [];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Filtros</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              data-testid="button-refresh-metrics"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select 
                value={filters.year} 
                onValueChange={(value) => setFilters({ ...filters, year: value })}
              >
                <SelectTrigger data-testid="select-year">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mês</label>
              <Select 
                value={filters.month} 
                onValueChange={(value) => setFilters({ ...filters, month: value })}
              >
                <SelectTrigger data-testid="select-month">
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select 
                value={filters.clientId} 
                onValueChange={(value) => setFilters({ ...filters, clientId: value, campaignId: 'all' })}
              >
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientes.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.tradeName || client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Campanha</label>
              <Select 
                value={filters.campaignId} 
                onValueChange={(value) => setFilters({ ...filters, campaignId: value })}
              >
                <SelectTrigger data-testid="select-campaign">
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {campanhas.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Colaborador</label>
              <Select 
                value={filters.userId} 
                onValueChange={(value) => setFilters({ ...filters, userId: value })}
              >
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Tarefa</label>
              <Select 
                value={filters.taskTypeId} 
                onValueChange={(value) => setFilters({ ...filters, taskTypeId: value })}
              >
                <SelectTrigger data-testid="select-task-type">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {taskTypes.map((taskType: any) => (
                    <SelectItem key={taskType.id} value={taskType.id.toString()}>
                      {taskType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Colaboradores</p>
                <p className="text-3xl font-bold text-blue-900 mt-1" data-testid="metric-colaboradores">
                  {summary.colaboradores || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Clientes</p>
                <p className="text-3xl font-bold text-green-900 mt-1" data-testid="metric-clientes">
                  {summary.clientes || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Campanhas</p>
                <p className="text-3xl font-bold text-purple-900 mt-1" data-testid="metric-campanhas">
                  {summary.campanhas || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-600 font-medium">Lançamentos</p>
                <p className="text-3xl font-bold text-cyan-900 mt-1" data-testid="metric-lancamentos">
                  {summary.lancamentos || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Horas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900" data-testid="metric-total-horas">
                  {formatHours(summary.totalHoras || 0)}
                </p>
                <p className="text-sm text-slate-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900" data-testid="metric-horas-abertas">
                  {formatHours(summary.horasAbertas || 0)}
                </p>
                <p className="text-sm text-blue-600">Abertas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900" data-testid="metric-horas-validacao">
                  {formatHours(summary.horasValidacao || 0)}
                </p>
                <p className="text-sm text-amber-600">Em Validação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900" data-testid="metric-horas-aprovadas">
                  {formatHours(summary.horasAprovadas || 0)}
                </p>
                <p className="text-sm text-green-600">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - Horas Lançadas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horas Lançadas (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.lineChart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" name="Horas" strokeWidth={2} />
                <Line type="monotone" dataKey="validacao" stroke="#f59e0b" name="Em Validação" strokeWidth={2} />
                <Line type="monotone" dataKey="rascunho" stroke="#6b7280" name="Rascunho" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Tipos de Tarefa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quantidade de Lançamentos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts.pieChart || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(charts.pieChart || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Horas por Colaborador */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horas por Colaborador</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.barChart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Dispersão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dispersão: Lançamentos vs Horas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis type="number" dataKey="lancamentos" name="Lançamentos" />
                <YAxis type="number" dataKey="horas" name="Horas" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Colaboradores" data={charts.scatterChart || []} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento por Cliente e Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Horas Abertas</TableHead>
                  <TableHead className="text-right">Horas em Validação</TableHead>
                  <TableHead className="text-right">Total de Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
                      Nenhum dado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row: any, index: number) => (
                    <TableRow key={index} data-testid={`table-row-${index}`}>
                      <TableCell className="font-medium">{row.cliente}</TableCell>
                      <TableCell>{row.campanha}</TableCell>
                      <TableCell className="text-right">{formatHours(row.horasAbertas)}</TableCell>
                      <TableCell className="text-right">{formatHours(row.horasValidacao)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatHours(row.totalHoras)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
