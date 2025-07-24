import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, MessageCircle, HourglassIcon, CheckCircle, Users } from "lucide-react";
import { StatsCard } from "./StatsCard";

export function ApprovalSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingEntries = [], isLoading } = useQuery({
    queryKey: ["/api/approvals/pending"],
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

  const formatHours = (hours: string | number) => {
    const h = parseFloat(hours.toString());
    const wholeHours = Math.floor(h);
    const minutes = Math.round((h - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getUserInitials = (user: any) => {
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Approval stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Pendentes"
          value={pendingEntries.length.toString()}
          subtitle="Pendentes aprovação"
          icon={HourglassIcon}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
        <StatsCard
          title="Aprovadas"
          value="89"
          subtitle="Aprovadas este mês"
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title="Colaboradores"
          value="8"
          subtitle="Colaboradores ativos"
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
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
          {pendingEntries.length === 0 ? (
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
                  {pendingEntries.map((entry: any) => (
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
