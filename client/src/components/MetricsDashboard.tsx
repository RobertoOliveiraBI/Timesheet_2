import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Building2, 
  Briefcase, 
  FileText,
  Clock,
  TrendingUp,
  RefreshCw,
  ChevronDown
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
  ResponsiveContainer,
  LabelList
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { queryClient } from "@/lib/queryClient";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const months = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export function MetricsDashboard() {
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString();

  const [filters, setFilters] = useState({
    months: [currentMonth],
    year: currentYear.toString(),
    clientIds: [] as string[],
    campaignIds: [] as string[],
    userIds: [] as string[],
    taskTypeId: 'all',
    costCenterId: 'all',
    managerId: 'all',
  });

  // Buscar clientes
  const { data: clientes = [] } = useQuery<any[]>({
    queryKey: ["/api/clientes"],
  });

  // Buscar campanhas
  const { data: campanhas = [] } = useQuery({
    queryKey: ["/api/campanhas"],
    queryFn: async () => {
      const response = await fetch("/api/campanhas", { credentials: "include" });
      return response.ok ? await response.json() : [];
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

  // Buscar gestores
  const { data: managers = [] } = useQuery({
    queryKey: ["/api/managers"],
    queryFn: async () => {
      const response = await fetch("/api/managers", { credentials: "include" });
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Buscar centros de custo
  const { data: costCenters = [] } = useQuery({
    queryKey: ["/api/cost-centers"],
    queryFn: async () => {
      const response = await fetch("/api/cost-centers", { credentials: "include" });
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
      filters.months.join(','), 
      filters.year, 
      filters.clientIds.join(','), 
      filters.campaignIds.join(','), 
      filters.userIds.join(','),
      filters.taskTypeId,
      filters.costCenterId,
      filters.managerId
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.months.length > 0) params.append('months', filters.months.join(','));
      if (filters.year) params.append('year', filters.year);
      if (filters.clientIds.length > 0) params.append('clientIds', filters.clientIds.join(','));
      if (filters.campaignIds.length > 0) params.append('campaignIds', filters.campaignIds.join(','));
      if (filters.userIds.length > 0) params.append('userIds', filters.userIds.join(','));
      if (filters.taskTypeId !== 'all') params.append('taskTypeId', filters.taskTypeId);
      if (filters.costCenterId !== 'all') params.append('costCenterId', filters.costCenterId);
      if (filters.managerId !== 'all') params.append('managerId', filters.managerId);

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

  const toggleMonth = (month: string) => {
    setFilters(prev => ({
      ...prev,
      months: prev.months.includes(month)
        ? prev.months.filter(m => m !== month)
        : [...prev.months, month]
    }));
  };

  const toggleClient = (clientId: string) => {
    setFilters(prev => ({
      ...prev,
      clientIds: prev.clientIds.includes(clientId)
        ? prev.clientIds.filter(id => id !== clientId)
        : [...prev.clientIds, clientId]
    }));
  };

  const toggleCampaign = (campaignId: string) => {
    setFilters(prev => ({
      ...prev,
      campaignIds: prev.campaignIds.includes(campaignId)
        ? prev.campaignIds.filter(id => id !== campaignId)
        : [...prev.campaignIds, campaignId]
    }));
  };

  const toggleUser = (userId: string) => {
    setFilters(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }));
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

  // Preparar dados do gráfico de dispersão com labels
  const scatterDataWithLabels = (charts.scatterChart || [])
    .sort((a: any, b: any) => b.horas - a.horas)
    .slice(0, 10);

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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <label className="text-sm font-medium mb-2 block">Meses</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" data-testid="select-months">
                    {filters.months.length === 0 
                      ? "Selecione os meses" 
                      : `${filters.months.length} selecionado(s)`
                    }
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2">
                  <div className="space-y-2">
                    {months.map(month => (
                      <div key={month.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`month-${month.value}`}
                          checked={filters.months.includes(month.value)}
                          onCheckedChange={() => toggleMonth(month.value)}
                          data-testid={`checkbox-month-${month.value}`}
                        />
                        <label
                          htmlFor={`month-${month.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {month.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Clientes</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" data-testid="select-clients">
                    {filters.clientIds.length === 0 
                      ? "Todos os clientes" 
                      : `${filters.clientIds.length} selecionado(s)`
                    }
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2 max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {clientes.map((client: any) => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={filters.clientIds.includes(client.id.toString())}
                          onCheckedChange={() => toggleClient(client.id.toString())}
                          data-testid={`checkbox-client-${client.id}`}
                        />
                        <label
                          htmlFor={`client-${client.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {client.tradeName || client.companyName}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Campanhas</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" data-testid="select-campaigns">
                    {filters.campaignIds.length === 0 
                      ? "Todas as campanhas" 
                      : `${filters.campaignIds.length} selecionada(s)`
                    }
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2 max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {campanhas.map((campaign: any) => (
                      <div key={campaign.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`campaign-${campaign.id}`}
                          checked={filters.campaignIds.includes(campaign.id.toString())}
                          onCheckedChange={() => toggleCampaign(campaign.id.toString())}
                          data-testid={`checkbox-campaign-${campaign.id}`}
                        />
                        <label
                          htmlFor={`campaign-${campaign.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {campaign.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Colaboradores</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" data-testid="select-users">
                    {filters.userIds.length === 0 
                      ? "Todos os colaboradores" 
                      : `${filters.userIds.length} selecionado(s)`
                    }
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2 max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {usuarios.map((user: any) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={filters.userIds.includes(user.id.toString())}
                          onCheckedChange={() => toggleUser(user.id.toString())}
                          data-testid={`checkbox-user-${user.id}`}
                        />
                        <label
                          htmlFor={`user-${user.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {user.firstName} {user.lastName}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Centro de Custo</label>
              <Select 
                value={filters.costCenterId} 
                onValueChange={(value) => setFilters({ ...filters, costCenterId: value })}
              >
                <SelectTrigger data-testid="select-cost-center">
                  <SelectValue placeholder="Todos os centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {costCenters.map((center: any) => (
                    <SelectItem key={center.id} value={center.id.toString()}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Gestor</label>
              <Select 
                value={filters.managerId} 
                onValueChange={(value) => setFilters({ ...filters, managerId: value })}
              >
                <SelectTrigger data-testid="select-manager">
                  <SelectValue placeholder="Todos os gestores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {managers.map((manager: any) => (
                    <SelectItem key={manager.id} value={manager.id.toString()}>
                      {manager.firstName} {manager.lastName}
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

      {/* Gráfico de Linha - Largura Total */}
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

      {/* Gráficos - Primeira Linha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Tipos de Tarefa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Soma de Horas por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={charts.pieChart || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.percentage}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(charts.pieChart || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}h`} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Mini tabela de detalhamento */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-xs">Tipo de Tarefa</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Horas</TableHead>
                    <TableHead className="text-right font-semibold text-xs">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(charts.pieChart || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500 py-4 text-sm">
                        Nenhum dado disponível
                      </TableCell>
                    </TableRow>
                  ) : (
                    (charts.pieChart || [])
                      .sort((a: any, b: any) => b.value - a.value)
                      .map((item: any, index: number) => (
                        <TableRow key={item.name} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-xs py-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="truncate">{item.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs py-2">{item.value.toFixed(2)}h</TableCell>
                          <TableCell className="text-right text-xs py-2">{item.percentage}%</TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Barras Horizontal - Horas por Colaborador */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horas por Colaborador (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={charts.barChart || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" name="Horas">
                  <LabelList dataKey="hours" position="right" formatter={(value: number) => `${value.toFixed(1)}h`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Dispersão - Largura Total */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispersão: Lançamentos vs Horas (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="lancamentos" 
                name="Lançamentos"
                label={{ value: 'Número de Lançamentos', position: 'bottom', offset: 40 }}
              />
              <YAxis 
                type="number" 
                dataKey="horas" 
                name="Horas"
                label={{ value: 'Total de Horas', angle: -90, position: 'left', offset: 40 }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Top 10 Colaboradores" data={scatterDataWithLabels} fill="#8b5cf6">
                <LabelList dataKey="name" position="top" offset={10} style={{ fontSize: '10px' }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
