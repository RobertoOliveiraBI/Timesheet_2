import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send } from "lucide-react";

const hourOptions = [
  { value: "0.25", label: "0:15" },
  { value: "0.5", label: "0:30" },
  { value: "0.75", label: "0:45" },
  { value: "1", label: "1:00" },
  { value: "1.25", label: "1:15" },
  { value: "1.5", label: "1:30" },
  { value: "2", label: "2:00" },
  { value: "3", label: "3:00" },
  { value: "4", label: "4:00" },
  { value: "5", label: "5:00" },
  { value: "6", label: "6:00" },
  { value: "7", label: "7:00" },
  { value: "8", label: "8:00" },
];

export function TimesheetForm() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    campaignId: "",
    taskTypeId: "",
    hours: "",
    description: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: taskTypes } = useQuery({
    queryKey: ["/api/task-types"],
  });

  const createTimeEntry = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/time-entries", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento de horas criado com sucesso!",
      });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        campaignId: "",
        taskTypeId: "",
        hours: "",
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar lançamento de horas",
        variant: "destructive",
      });
    },
  });

  const submitTimeEntry = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/time-entries", {
        ...data,
        status: "PENDING",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento enviado para aprovação!",
      });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        campaignId: "",
        taskTypeId: "",
        hours: "",
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao enviar para aprovação",
        variant: "destructive",
      });
    },
  });

  const handleSaveDraft = () => {
    if (!formData.campaignId || !formData.taskTypeId || !formData.hours) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    createTimeEntry.mutate({
      ...formData,
      campaignId: parseInt(formData.campaignId),
      taskTypeId: parseInt(formData.taskTypeId),
      hours: parseFloat(formData.hours),
      status: "DRAFT",
    });
  };

  const handleSubmitForApproval = () => {
    if (!formData.campaignId || !formData.taskTypeId || !formData.hours) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    submitTimeEntry.mutate({
      ...formData,
      campaignId: parseInt(formData.campaignId),
      taskTypeId: parseInt(formData.taskTypeId),
      hours: parseFloat(formData.hours),
    });
  };

  const selectedCampaign = campaigns?.find((c: any) => c.id === parseInt(formData.campaignId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lançar Nova Entrada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="economicGroup">Grupo Econômico</Label>
            <Input
              id="economicGroup"
              value={selectedCampaign?.client?.economicGroup?.name || ""}
              disabled
              placeholder="Selecione uma campanha primeiro"
            />
          </div>

          <div>
            <Label htmlFor="client">Cliente</Label>
            <Input
              id="client"
              value={selectedCampaign?.client?.companyName || ""}
              disabled
              placeholder="Selecione uma campanha primeiro"
            />
          </div>

          <div>
            <Label htmlFor="campaign">Campanha</Label>
            <Select value={formData.campaignId} onValueChange={(value) => setFormData({ ...formData, campaignId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {campaigns?.map((campaign: any) => (
                  <SelectItem key={campaign.id} value={campaign.id.toString()}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="taskType">Tipo de Tarefa</Label>
            <Select value={formData.taskTypeId} onValueChange={(value) => setFormData({ ...formData, taskTypeId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {taskTypes?.map((taskType: any) => (
                  <SelectItem key={taskType.id} value={taskType.id.toString()}>
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: taskType.color }}
                      />
                      {taskType.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="hours">Horas</Label>
            <Select value={formData.hours} onValueChange={(value) => setFormData({ ...formData, hours: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione as horas" />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva a atividade realizada..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="lg:col-span-4 flex justify-end space-x-3 mt-4">
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={createTimeEntry.isPending}
            >
              Salvar como Rascunho
            </Button>
            <Button 
              onClick={handleSubmitForApproval}
              disabled={submitTimeEntry.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar para Aprovação
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
