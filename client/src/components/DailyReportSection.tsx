import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar, TrendingUp, TrendingDown, RefreshCw, Download } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { queryClient } from "@/lib/queryClient";

export function DailyReportSection() {
  const [filters, setFilters] = useState({
    month: format(new Date(), "yyyy-MM"),
    userId: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Buscar usuários para filtro de colaborador
  const { data: usuarios = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Buscar entradas para o relatório consolidado
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ["/api/time-entries/daily", filters.month, filters.userId, filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      let startDate, endDate;
      
      // Usar filtro de data personalizado se fornecido, senão usar o mês
      if (filters.dateFrom && filters.dateTo) {
        startDate = filters.dateFrom;
        endDate = filters.dateTo;
      } else {
        const [year, month] = filters.month.split("-");
        startDate = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");
        endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");
      }
      
      let url = `/api/time-entries?fromDate=${startDate}&toDate=${endDate}`;
      
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return [];
      
      let entries = await response.json();
      
      // Filtrar por usuário se especificado
      if (filters.userId !== "all") {
        entries = entries.filter((entry: any) => 
          entry.user?.id?.toString() === filters.userId
        );
      }
      
      return entries;
    },
  });

  // Consolidar dados por dia e usuário
  const dailyData = useMemo(() => {
    const consolidated: Record<string, Record<string, any>> = {};

    timeEntries.forEach((entry: any) => {
      const date = entry.date;
      const userId = entry.user?.id;
      const userName = `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim();
      const key = `${date}-${userId}`;

      if (!consolidated[key]) {
        consolidated[key] = {
          date,
          userId,
          userName,
          totalHours: 0,
          entries: []
        };
      }

      consolidated[key].totalHours += parseFloat(entry.hours || 0);
      consolidated[key].entries.push(entry);
    });

    // Converter para array e adicionar cálculo de saldo
    return Object.values(consolidated).map((day: any) => {
      const targetHours = 8; // 8 horas por dia
      const balance = day.totalHours - targetHours;
      
      return {
        ...day,
        targetHours,
        balance,
        status: balance === 0 ? 'balanced' : balance > 0 ? 'over' : 'under'
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [timeEntries]);

  // Calcular estatísticas gerais
  const stats = useMemo(() => {
    const totalDays = dailyData.length;
    const totalHours = dailyData.reduce((sum, day) => sum + day.totalHours, 0);
    const totalBalance = dailyData.reduce((sum, day) => sum + day.balance, 0);
    const daysOver = dailyData.filter(day => day.status === 'over').length;
    const daysUnder = dailyData.filter(day => day.status === 'under').length;
    const daysBalanced = dailyData.filter(day => day.status === 'balanced').length;

    return {
      totalDays,
      totalHours,
      totalBalance,
      daysOver,
      daysUnder,
      daysBalanced,
      averageHours: totalDays > 0 ? totalHours / totalDays : 0
    };
  }, [dailyData]);

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR });
  };

  const getBalanceColor = (status: string) => {
    switch (status) {
      case 'over': return 'bg-green-50 text-green-700';
      case 'under': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getBalanceIcon = (status: string) => {
    switch (status) {
      case 'over': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'under': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/time-entries/daily"] });
  };

  const handleExportCSV = () => {
    if (dailyData.length === 0) return;

    const csvHeaders = ['Data', 'Colaborador', 'Horas Lançadas', 'Meta (8h)', 'Saldo', 'Status'];
    const csvRows = dailyData.map(day => [
      formatDate(day.date),
      day.userName || 'Usuário desconhecido',
      formatHours(day.totalHours),
      formatHours(day.targetHours),
      `${day.balance >= 0 ? '+' : ''}${formatHours(day.balance)}`,
      day.status === 'over' ? 'Acima da Meta' : day.status === 'under' ? 'Abaixo da Meta' : 'Equilibrado'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_consolidado_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mês/Ano</label>
              <input
                type="month"
                value={filters.month}
                onChange={(e) => {
                  setFilters({ ...filters, month: e.target.value, dateFrom: "", dateTo: "" });
                }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!!(filters.dateFrom || filters.dateTo)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data Inicial</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters({ ...filters, dateFrom: e.target.value, month: "" });
                }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data Final</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters({ ...filters, dateTo: e.target.value, month: "" });
                }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Colaborador</label>
              <Select
                value={filters.userId}
                onValueChange={(value) => setFilters({ ...filters, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  {usuarios.map((usuario: any) => (
                    <SelectItem key={usuario.id} value={usuario.id.toString()}>
                      {usuario.firstName || usuario.first_name} {usuario.lastName || usuario.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Dias"
          value={stats.totalDays.toString()}
          subtitle="Dias com lançamentos"
          icon={Calendar}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Total de Horas"
          value={formatHours(stats.totalHours)}
          subtitle="Horas trabalhadas"
          icon={Clock}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title="Média Diária"
          value={formatHours(stats.averageHours)}
          subtitle="Horas por dia"
          icon={Clock}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
        <StatsCard
          title="Saldo Total"
          value={`${stats.totalBalance >= 0 ? '+' : ''}${formatHours(stats.totalBalance)}h`}
          subtitle="Diferença vs 8h/dia"
          icon={stats.totalBalance >= 0 ? TrendingUp : TrendingDown}
          iconColor={stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"}
          iconBgColor={stats.totalBalance >= 0 ? "bg-green-100" : "bg-red-100"}
        />
      </div>

      {/* Resumo de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Dias com Horas Extras</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">{stats.daysOver}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium">Dias com Horas Faltantes</span>
            </div>
            <div className="text-2xl font-bold text-red-600 mt-2">{stats.daysUnder}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-sm font-medium">Dias Equilibrados</span>
            </div>
            <div className="text-2xl font-bold text-gray-600 mt-2">{stats.daysBalanced}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Dados Diários */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Relatório Consolidado por Dia</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                data-testid="button-refresh-daily-report"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                disabled={dailyData.length === 0}
                data-testid="button-export-csv-daily"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : dailyData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum lançamento encontrado para o período selecionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Colaborador</th>
                    <th className="text-right p-3">Horas Lançadas</th>
                    <th className="text-right p-3">Meta (8h)</th>
                    <th className="text-right p-3">Saldo</th>
                    <th className="text-center p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map((day, index) => (
                    <tr 
                      key={`${day.date}-${day.userId}`} 
                      className={`border-b hover:bg-gray-50 ${getBalanceColor(day.status)}`}
                    >
                      <td className="p-3 font-medium">
                        {formatDate(day.date)}
                      </td>
                      <td className="p-3">
                        {day.userName || 'Usuário desconhecido'}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatHours(day.totalHours)}h
                      </td>
                      <td className="p-3 text-right text-gray-600">
                        {formatHours(day.targetHours)}h
                      </td>
                      <td className="p-3 text-right font-medium">
                        {day.balance >= 0 ? '+' : ''}{formatHours(day.balance)}h
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center">
                          {getBalanceIcon(day.status)}
                        </div>
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