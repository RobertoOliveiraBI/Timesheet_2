import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, ChevronLeft, ChevronRight, MessageSquare, Trash2 } from "lucide-react";

interface TimeEntry {
  campaignId: string;
  campaignName: string;
  campaignTaskId: string;
  taskDescription: string;
  taskTypeId: string;
  taskName: string;
  hours: Record<string, string>; // day of week -> hours
  comment: string;
  total: number;
}

export function WeeklyTimesheetForm() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: taskTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
  });

  const { data: campaignTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/campaign-tasks"],
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
      campaignId: "",
      campaignName: "",
      campaignTaskId: "",
      taskDescription: "",
      taskTypeId: "",
      taskName: "",
      hours: {},
      comment: "",
      total: 0
    };
    setTimeEntries([...timeEntries, newEntry]);
  };

  const removeTimeEntry = (index: number) => {
    const updatedEntries = timeEntries.filter((_, i) => i !== index);
    setTimeEntries(updatedEntries);
  };

  const updateTimeEntry = (index: number, field: string, value: string) => {
    const updatedEntries = [...timeEntries];
    
    if (field === 'campaignId') {
      const campaign = Array.isArray(campaigns) ? campaigns.find((c: any) => c.id.toString() === value) : null;
      updatedEntries[index].campaignId = value;
      updatedEntries[index].campaignName = campaign?.name || "";
      // Limpar tarefa específica quando mudar campanha
      updatedEntries[index].campaignTaskId = "";
      updatedEntries[index].taskDescription = "";
      updatedEntries[index].taskTypeId = "";
      updatedEntries[index].taskName = "";
    } else if (field === 'campaignTaskId') {
      const campaignTask = Array.isArray(campaignTasks) ? campaignTasks.find((ct: any) => ct.id.toString() === value) : null;
      updatedEntries[index].campaignTaskId = value;
      if (campaignTask) {
        updatedEntries[index].taskDescription = campaignTask.description || "";
        updatedEntries[index].taskTypeId = campaignTask.taskTypeId?.toString() || "";
        const taskType = Array.isArray(taskTypes) ? taskTypes.find((t: any) => t.id === campaignTask.taskTypeId) : null;
        updatedEntries[index].taskName = taskType?.name || "";
      }
    } else if (field === 'taskTypeId') {
      const taskType = Array.isArray(taskTypes) ? taskTypes.find((t: any) => t.id.toString() === value) : null;
      updatedEntries[index].taskTypeId = value;
      updatedEntries[index].taskName = taskType?.name || "";
    } else if (field === 'comment') {
      updatedEntries[index].comment = value;
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

  // Filtrar tarefas específicas da campanha selecionada
  const getAvailableCampaignTasks = (campaignId: string) => {
    return Array.isArray(campaignTasks) ? campaignTasks.filter((task: any) => task.campaignId.toString() === campaignId) : [];
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
    mutationFn: async () => {
      // Aqui você implementaria a lógica para salvar todas as entradas
      for (const entry of timeEntries) {
        for (let i = 0; i < 5; i++) {
          const hours = parseFloat(entry.hours[i.toString()] || '0');
          if (hours > 0) {
            const date = weekDays[i].toISOString().split('T')[0];
            await apiRequest("POST", "/api/time-entries", {
              date,
              campaignId: parseInt(entry.campaignId),
              taskTypeId: parseInt(entry.taskTypeId),
              hours,
              description: `${entry.campaignName} - ${entry.taskName}`
            });
          }
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Timesheet salvo com sucesso!",
      });
      setTimeEntries([]);
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar timesheet",
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
            <Button onClick={addTimeEntry} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar linha
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {timeEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Plus className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium mb-2">Nenhuma entrada de tempo</p>
              <p className="text-sm">Clique em "Adicionar linha" para começar a registrar suas horas</p>
            </div>
          ) : (
            <>
              {timeEntries.map((entry, index) => (
                <Card key={index} className="border border-slate-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Seleção de Projeto */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Projeto</label>
                        <Select 
                          value={entry.campaignId} 
                          onValueChange={(value) => updateTimeEntry(index, 'campaignId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar projeto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(campaigns) && campaigns.map((campaign: any) => (
                              <SelectItem key={campaign.id} value={campaign.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{campaign.name}</span>
                                  <span className="text-xs text-slate-500">{campaign.client?.companyName}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Seleção de Tarefa Específica */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Tarefa Específica</label>
                        <Select 
                          value={entry.campaignTaskId} 
                          onValueChange={(value) => updateTimeEntry(index, 'campaignTaskId', value)}
                          disabled={!entry.campaignId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar tarefa..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableCampaignTasks(entry.campaignId).map((task: any) => (
                              <SelectItem key={task.id} value={task.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{task.description}</span>
                                  <span className="text-xs text-slate-500">{task.taskType?.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {entry.taskDescription && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800 font-medium">{entry.taskDescription}</p>
                            {entry.taskName && (
                              <p className="text-xs text-blue-600 mt-1">Categoria: {entry.taskName}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Horas da semana */}
                    <div className="space-y-3 mb-6">
                      <label className="text-sm font-medium text-slate-700">Horas da semana</label>
                      <div className="grid grid-cols-5 gap-3">
                        {weekDays.map((day, dayIndex) => (
                          <div key={dayIndex} className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">
                              {formatDate(day)}
                            </label>
                            <Input
                              type="text"
                              placeholder="0:00"
                              value={entry.hours[dayIndex.toString()] || ''}
                              onChange={(e) => updateTimeEntry(index, `day-${dayIndex}`, e.target.value)}
                              className="text-center"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-sm font-medium text-slate-700">Total da linha:</span>
                        <span className="text-lg font-bold text-primary">{formatHours(entry.total)}</span>
                      </div>
                    </div>

                    {/* Campo de comentário */}
                    <div className="space-y-2 mb-4">
                      <label className="text-sm font-medium text-slate-700 flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Comentário (opcional)
                      </label>
                      <Textarea
                        placeholder="Adicione detalhes sobre esta atividade..."
                        value={entry.comment || ''}
                        onChange={(e) => updateTimeEntry(index, 'comment', e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Botão remover */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeEntry(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remover linha
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Resumo total */}
              <Card className="bg-slate-50 border-slate-300">
                <CardContent className="p-6">
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 mb-1">Segunda</p>
                      <p className="text-lg font-bold text-slate-900">{formatHours(getColumnTotal(0))}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 mb-1">Terça</p>
                      <p className="text-lg font-bold text-slate-900">{formatHours(getColumnTotal(1))}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 mb-1">Quarta</p>
                      <p className="text-lg font-bold text-slate-900">{formatHours(getColumnTotal(2))}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 mb-1">Quinta</p>
                      <p className="text-lg font-bold text-slate-900">{formatHours(getColumnTotal(3))}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 mb-1">Sexta</p>
                      <p className="text-lg font-bold text-slate-900">{formatHours(getColumnTotal(4))}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-300 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-slate-700">Total da semana:</span>
                      <span className="text-2xl font-bold text-primary">{formatHours(getGrandTotal())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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