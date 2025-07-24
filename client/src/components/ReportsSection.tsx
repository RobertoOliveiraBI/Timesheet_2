import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users,
  Search,
  FileDown,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import { StatsCard } from "./StatsCard";

export function ReportsSection() {
  const [filters, setFilters] = useState({
    period: "currentMonth",
    userId: "all",
    clientId: "all",
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/reports/user-stats"],
  });

  const { data: teamStats } = useQuery({
    queryKey: ["/api/reports/team-stats"],
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["/api/time-entries"],
  });

  const formatHours = (hours: string | number) => {
    const h = parseFloat(hours.toString());
    const wholeHours = Math.floor(h);
    const minutes = Math.round((h - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getUserInitials = (user: any) => {
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Calculate totals from actual data
  const totalHours = timeEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.hours), 0);
  const billableHours = timeEntries
    .filter((entry: any) => entry.taskType?.isBillable)
    .reduce((sum: number, entry: any) => sum + parseFloat(entry.hours), 0);
  const utilization = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
  const activeUsers = new Set(timeEntries.map((entry: any) => entry.userId)).size;

  return (
    <div className="space-y-8">
      {/* Report filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Select
                value={filters.period}
                onValueChange={(value) => setFilters({ ...filters, period: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="currentMonth">Este mês</SelectItem>
                  <SelectItem value="lastMonth">Mês passado</SelectItem>
                  <SelectItem value="last3Months">Últimos 3 meses</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={filters.userId}
                onValueChange={(value) => setFilters({ ...filters, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {/* Would be populated with actual users */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={filters.clientId}
                onValueChange={(value) => setFilters({ ...filters, clientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {/* Would be populated with actual clients */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button className="w-full bg-primary hover:bg-primary/90">
                <Search className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total"
          value={Math.round(totalHours).toString()}
          subtitle="Horas totais"
          icon={Clock}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Faturáveis"
          value={Math.round(billableHours).toString()}
          subtitle="Horas faturáveis"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title="Utilização"
          value={`${utilization}%`}
          subtitle="Taxa de utilização"
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
        <StatsCard
          title="Colaboradores"
          value={activeUsers.toString()}
          subtitle="Colaboradores ativos"
          icon={Users}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
      </div>

      {/* Detailed report table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Relatório Detalhado</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </div>
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
                      Colaborador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Data
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {timeEntries.slice(0, 20).map((entry: any) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-xs">
                              {getUserInitials(entry.user)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-slate-900">
                              {`${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim()}
                            </p>
                            <p className="text-xs text-slate-500">{entry.user?.position || entry.user?.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.campaign?.client?.companyName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {formatHours(entry.hours)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.taskType?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.status}
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
