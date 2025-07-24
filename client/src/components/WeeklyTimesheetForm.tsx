import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface TimeEntry {
  campaignId: string;
  campaignName: string;
  taskTypeId: string;
  taskName: string;
  hours: Record<string, string>; // day of week -> hours
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
      taskTypeId: "",
      taskName: "",
      hours: {},
      total: 0
    };
    setTimeEntries([...timeEntries, newEntry]);
  };

  const updateTimeEntry = (index: number, field: string, value: string) => {
    const updatedEntries = [...timeEntries];
    if (field === 'campaignId') {
      const campaign = Array.isArray(campaigns) ? campaigns.find((c: any) => c.id.toString() === value) : null;
      updatedEntries[index].campaignId = value;
      updatedEntries[index].campaignName = campaign?.name || "";
    } else if (field === 'taskTypeId') {
      const taskType = Array.isArray(taskTypes) ? taskTypes.find((t: any) => t.id.toString() === value) : null;
      updatedEntries[index].taskTypeId = value;
      updatedEntries[index].taskName = taskType?.name || "";
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-sm">Cliente & Projeto</th>
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
                      value={entry.campaignId} 
                      onValueChange={(value) => updateTimeEntry(index, 'campaignId', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(campaigns) && campaigns.map((campaign: any) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Select 
                      value={entry.taskTypeId} 
                      onValueChange={(value) => updateTimeEntry(index, 'taskTypeId', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar tarefa" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(taskTypes) && taskTypes.map((taskType: any) => (
                          <SelectItem key={taskType.id} value={taskType.id.toString()}>
                            {taskType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {weekDays.map((_, dayIndex) => (
                    <td key={dayIndex} className="p-2">
                      <Input
                        type="text"
                        placeholder="0:00"
                        value={entry.hours[dayIndex.toString()] || ''}
                        onChange={(e) => updateTimeEntry(index, `day-${dayIndex}`, e.target.value)}
                        className="text-center text-sm"
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center font-medium">
                    {formatHours(entry.total)}
                  </td>
                </tr>
              ))}
              
              {/* Empty rows for adding new entries */}
              {timeEntries.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-slate-500">
                    Clique em "Adicionar linha" para começar a lançar suas horas
                  </td>
                </tr>
              )}
            </tbody>
            {timeEntries.length > 0 && (
              <tfoot>
                <tr className="border-t bg-slate-50 font-medium">
                  <td className="p-2" colSpan={2}>Total</td>
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