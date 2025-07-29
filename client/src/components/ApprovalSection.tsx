import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, MessageCircle, HourglassIcon, CheckCircle, Users, CalendarIcon, Clock, DollarSign, TrendingUp, AlertCircle, Target } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ApprovalSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Format date for API call
  const formatDateForAPI = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const { data: pendingEntries = [], isLoading } = useQuery({
    queryKey: ["/api/approvals/pending", selectedDate ? formatDateForAPI(selectedDate) : null],
    queryFn: async () => {
      const url = selectedDate 
        ? `/api/approvals/pending?date=${formatDateForAPI(selectedDate)}`
        : "/api/approvals/pending";
      
      const response = await fetch(url, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error('Failed to fetch pending entries');
      }
      return response.json();
    },
  });

  // Get team stats for indicators
  const teamStatsKey = selectedDate 
    ? `/api/reports/team-stats?date=${formatDateForAPI(selectedDate)}`
    : "/api/reports/team-stats";
  
  const { data: teamStats, isLoading: loadingTeamStats } = useQuery({
    queryKey: [teamStatsKey],
  });

  // Get validation count
  const { data: validationCount, isLoading: loadingValidationCount } = useQuery({
    queryKey: ["/api/time-entries/validation-count"],
  });

  const approveEntry = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/time-entries/${id}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento aprovado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao aprovar lançamento",
        variant: "destructive",
      });
    },
  });

  const rejectEntry = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/time-entries/${id}/reject`, {
        comment: "Rejeitado pelo gestor",
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento rejeitado!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao rejeitar lançamento",
        variant: "destructive",
      });
    },
  });



  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getUserInitials = (user: any) => {
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // Function to format hours like the other components  
  const formatHours = (hours: string | number) => {
    const h = parseFloat(hours.toString()) || 0;
    const wholeHours = Math.floor(h);
    const minutes = Math.round((h - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Data:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    defaultMonth={new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
              className="text-sm"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(undefined as any)}
              className="text-sm"
            >
              Limpar Filtro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatsCard
          title="Total em Validação"
          value={teamStats ? formatHours((teamStats as any).validationHours || 0) : "0:00"}
          subtitle="Horas aguardando aprovação"
          icon={Clock}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Faturáveis"
          value={teamStats ? formatHours(teamStats.billableHours || 0) : "0:00"}
          subtitle="Horas faturáveis pendentes"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title="Não Faturáveis"
          value={teamStats ? formatHours(teamStats.nonBillableHours || 0) : "0:00"}
          subtitle="Horas não faturáveis pendentes"
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
        <StatsCard
          title="Lançamentos"
          value={(teamStats as any)?.validationCount?.toString() || "0"}
          subtitle="Entradas em validação"
          icon={AlertCircle}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
        <StatsCard
          title="Colaboradores"
          value={(teamStats?.activeCollaborators || 0).toString()}
          subtitle="Colaboradores com lançamentos"
          icon={Users}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100"
        />
      </div>

      {/* Pending approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lançamentos Pendentes</CardTitle>
            <div className="flex space-x-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-1" />
                Aprovar Selecionados
              </Button>
              <Button size="sm" variant="outline">
                <X className="w-4 h-4 mr-1" />
                Rejeitar Selecionados
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!Array.isArray(pendingEntries) || pendingEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhum lançamento pendente de aprovação.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <Checkbox />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Colaborador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Atividade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Horas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Array.isArray(pendingEntries) && pendingEntries.map((entry: any) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4">
                        <Checkbox />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-xs">
                              {getUserInitials(entry.user)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-slate-900">
                              {`${entry.user.firstName || ''} ${entry.user.lastName || ''}`.trim()}
                            </p>
                            <p className="text-xs text-slate-500">{entry.user.position || entry.user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {entry.campaign?.client?.companyName || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-900">{entry.taskType?.name}</p>
                        <p className="text-xs text-slate-500">{entry.description || 'Sem descrição'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {formatHours(entry.hours)}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => approveEntry.mutate(entry.id)}
                          disabled={approveEntry.isPending}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rejectEntry.mutate(entry.id)}
                          disabled={rejectEntry.isPending}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
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
