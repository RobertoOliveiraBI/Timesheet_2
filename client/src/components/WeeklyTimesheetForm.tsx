import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useSimpleAuth";
import { Plus, ChevronLeft, ChevronRight, Save, Send, Eye } from "lucide-react";

interface TimeEntry {
  clientId: string;
  clientName: string;
  campaignId: string;
  campaignName: string;
  campaignTaskId: string;
  taskName: string;
  hours: Record<string, string>; // day of week -> hours
  total: number;
}

export function WeeklyTimesheetForm() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Só carrega dados se o usuário estiver autenticado
  const { data: clients = [], isLoading: clientsLoading, isError: clientsError } = useQuery<any[]>({
    queryKey: ["/api/clientes"],
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!user,
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!user,
  });

  const { data: campaignTasks = [], isLoading: campaignTasksLoading } = useQuery<any[]>({
    queryKey: ["/api/campaign-tasks"],
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!user,
  });

  // Prefetch data as soon as the user is available so dropdowns are ready
  useEffect(() => {
    if (user) {
      queryClient.prefetchQuery({ queryKey: ["/api/clientes"] });
      queryClient.prefetchQuery({ queryKey: ["/api/campaigns"] });
      queryClient.prefetchQuery({ queryKey: ["/api/campaign-tasks"] });
    }
  }, [user, queryClient]);

  // Debug: log para verificar dados
  console.log('Timesheet Form - Dados carregados:', {
    user: !!user,
    clients: clients?.length || 0,
    campaigns: campaigns?.length || 0,
    campaignTasks: campaignTasks?.length || 0,
    clientsLoading,
    clientsError
  });

  // Calcular os dias da semana
  const getWeekDays = () => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - start.getDay() + 1); // Segunda-feira
    const days = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[4];
    return `${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const addTimeEntry = () => {
    const newEntry: TimeEntry = {
      clientId: "",
      clientName: "",
      campaignId: "",
      campaignName: "",
      campaignTaskId: "",
      taskName: "",
      hours: {},
      total: 0
    };
    setTimeEntries([...timeEntries, newEntry]);
  };

  // Gerar opções de horas (15 em 15 minutos até 12 horas)
  const generateHourOptions = () => {
    const options = [{ value: "0", label: "0:00" }];
    for (let h = 0; h < 12; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 0 && m === 0) continue; // Já adicionamos 0:00
        const hours = h + m / 60;
        const label = `${h}:${m.toString().padStart(2, '0')}`;
        options.push({ value: hours.toString(), label });
      }
    }
    return options;
  };

  const hourOptions = generateHourOptions();

  // Função para filtrar campanhas por cliente
  const getFilteredCampaigns = (clientId: string) => {
    if (!clientId || !Array.isArray(campaigns)) return [];
    return campaigns.filter((campaign: any) => campaign.clientId?.toString() === clientId);
  };

  // Função para filtrar tarefas por campanha
  const getFilteredCampaignTasks = (campaignId: string) => {
    if (!campaignId || !Array.isArray(campaignTasks)) return [];
    return campaignTasks.filter((task: any) => task.campaignId?.toString() === campaignId);
  };

  const updateTimeEntry = (index: number, field: string, value: string) => {
    const updatedEntries = [...timeEntries];
    
    if (field === 'clientId') {
      const client = Array.isArray(clients) ? clients.find((c: any) => c.id.toString() === value) : null;
      updatedEntries[index].clientId = value;
      updatedEntries[index].clientName = client ? (client.tradeName || client.companyName) : "";
      // Reset valores dependentes
      updatedEntries[index].campaignId = "";
      updatedEntries[index].campaignName = "";
      updatedEntries[index].campaignTaskId = "";
      updatedEntries[index].taskName = "";
    } else if (field === 'campaignId') {
      const campaign = Array.isArray(campaigns) ? campaigns.find((c: any) => c.id.toString() === value) : null;
      updatedEntries[index].campaignId = value;
      updatedEntries[index].campaignName = campaign?.name || "";
      // Reset valores dependentes
      updatedEntries[index].campaignTaskId = "";
      updatedEntries[index].taskName = "";
    } else if (field === 'campaignTaskId') {
      const campaignTask = Array.isArray(campaignTasks) ? campaignTasks.find((t: any) => t.id.toString() === value) : null;
      updatedEntries[index].campaignTaskId = value;
      updatedEntries[index].taskName = campaignTask?.description || "";
    } else if (field.startsWith('day-')) {
      const dayIndex = field.split('-')[1];
      updatedEntries[index].hours[dayIndex] = value;
      // Recalcular total
      const total = Object.values(updatedEntries[index].hours).reduce((sum, hours) => {
        const h = parseFloat(hours) || 0;
        return sum + h;
      }, 0);
      updatedEntries[index].total = total;
    }
    setTimeEntries(updatedEntries);
  };

  const getColumnTotal = (dayIndex: number) => {
    return timeEntries.reduce((sum, entry) => {
      const hours = parseFloat(entry.hours[dayIndex.toString()] || '0');
      return sum + hours;
    }, 0);
  };

  const getGrandTotal = () => {
    return timeEntries.reduce((sum, entry) => sum + entry.total, 0);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const saveTimesheet = useMutation({
    mutationFn: async (status: 'RASCUNHO' | 'SALVO' | 'VALIDACAO') => {
      const savedEntries = [];
      for (const entry of timeEntries) {
        for (let i = 0; i < 5; i++) {
          const hours = parseFloat(entry.hours[i.toString()] || '0');
          if (hours > 0) {
            const date = weekDays[i].toISOString().split('T')[0];
            const response = await apiRequest("POST", "/api/time-entries", {
              date,
              campaignId: parseInt(entry.campaignId),
              campaignTaskId: parseInt(entry.campaignTaskId),
              hours: hours.toString(),
              description: `${entry.campaignName} - ${entry.taskName}`,
              status,
              submittedAt: status === 'VALIDACAO' ? new Date().toISOString() : null
            });
            savedEntries.push(await response.json());
          }
        }
      }
      return { status, entries: savedEntries };
    },
    onSuccess: (result) => {
      const statusMessages = {
        'RASCUNHO': 'Timesheet salvo como rascunho!',
        'SALVO': 'Timesheet salvo com sucesso!',
        'VALIDACAO': 'Timesheet enviado para validação!'
      };
      
      toast({
        title: "Sucesso",
        description: statusMessages[result.status],
      });
      
      if (result.status === 'VALIDACAO') {
        setTimeEntries([]);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar timesheet",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Timesheet semanal</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{formatWeekRange()}</span>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={addTimeEntry} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar linha
              </Button>
              
              {timeEntries.length > 0 && (
                <>
                  <Button 
                    onClick={() => saveTimesheet.mutate('RASCUNHO')} 
                    size="sm" 
                    variant="outline"
                    disabled={saveTimesheet.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Rascunho
                  </Button>
                  
                  <Button 
                    onClick={() => saveTimesheet.mutate('SALVO')} 
                    size="sm" 
                    variant="secondary"
                    disabled={saveTimesheet.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  
                  <Button 
                    onClick={() => saveTimesheet.mutate('VALIDACAO')} 
                    size="sm"
                    disabled={saveTimesheet.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar para Aprovação
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-sm">Cliente</th>
                <th className="text-left p-2 font-medium text-sm">Campanha</th>
                <th className="text-left p-2 font-medium text-sm">Tarefa</th>
                {weekDays.map((day, index) => (
                  <th key={index} className="text-center p-2 font-medium text-sm min-w-20">
                    {formatDate(day)}
                  </th>
                ))}
                <th className="text-center p-2 font-medium text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((entry, index) => (
                <tr key={index} className="border-b hover:bg-slate-50">
                  <td className="p-2">
                    <Select 
                      value={entry.clientId} 
                      onValueChange={(value) => updateTimeEntry(index, 'clientId', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientsLoading ? (
                          <SelectItem value="loading" disabled>Carregando clientes...</SelectItem>
                        ) : Array.isArray(clients) && clients.length > 0 ? (
                          clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.tradeName || client.companyName}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhum cliente disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Select 
                      value={entry.campaignId} 
                      onValueChange={(value) => updateTimeEntry(index, 'campaignId', value)}
                      disabled={!entry.clientId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={entry.clientId ? "Selecionar campanha" : "Selecione cliente primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignsLoading ? (
                          <SelectItem value="loading" disabled>Carregando campanhas...</SelectItem>
                        ) : entry.clientId ? (
                          getFilteredCampaigns(entry.clientId).map((campaign: any) => (
                            <SelectItem key={campaign.id} value={campaign.id.toString()}>
                              {campaign.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhuma campanha disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Select 
                      value={entry.campaignTaskId} 
                      onValueChange={(value) => updateTimeEntry(index, 'campaignTaskId', value)}
                      disabled={!entry.campaignId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={entry.campaignId ? "Selecionar tarefa" : "Selecione campanha primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignTasksLoading ? (
                          <SelectItem value="loading" disabled>Carregando tarefas...</SelectItem>
                        ) : entry.campaignId ? (
                          getFilteredCampaignTasks(entry.campaignId).map((task: any) => (
                            <SelectItem key={task.id} value={task.id.toString()}>
                              {task.description}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhuma tarefa disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </td>
                  {weekDays.map((_, dayIndex) => (
                    <td key={dayIndex} className="p-2">
                      <Select
                        value={entry.hours[dayIndex.toString()] || "0"}
                        onValueChange={(value) => updateTimeEntry(index, `day-${dayIndex}`, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="0:00" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {hourOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                  <td className="p-2 text-center font-medium">
                    {formatHours(entry.total || 0)}
                  </td>
                </tr>
              ))}
              
              {/* Empty rows for adding new entries */}
              {timeEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-slate-500">
                    Clique em "Adicionar linha" para começar a lançar suas horas
                  </td>
                </tr>
              )}
            </tbody>
            {timeEntries.length > 0 && (
              <tfoot>
                <tr className="border-t bg-slate-50 font-medium">
                  <td className="p-2" colSpan={3}>Total</td>
                  {weekDays.map((_, dayIndex) => (
                    <td key={dayIndex} className="p-2 text-center">
                      {formatHours(getColumnTotal(dayIndex))}
                    </td>
                  ))}
                  <td className="p-2 text-center font-bold">
                    {formatHours(getGrandTotal())}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        
        {timeEntries.length > 0 && (
          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => saveTimesheet.mutate()}
              disabled={saveTimesheet.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {saveTimesheet.isPending ? "Salvando..." : "Salvar timesheet"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}