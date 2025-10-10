import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const taskSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente"),
  campaignId: z.string().min(1, "Selecione uma campanha"),
  taskTypeId: z.string().min(1, "Selecione um tipo de tarefa"),
  description: z.string().min(1, "Digite uma descrição"),
});

type TaskFormData = z.infer<typeof taskSchema>;

export function ManagerCampaignTasksForm() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["/api/clientes"],
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["/api/clientes", selectedClientId, "campanhas"],
    enabled: !!selectedClientId,
  });

  const { data: taskTypes, isLoading: loadingTaskTypes } = useQuery({
    queryKey: ["/api/task-types"],
  });

  const { data: campaignTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ["/api/campanhas", selectedCampaignId, "tarefas"],
    enabled: !!selectedCampaignId,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      clientId: "",
      campaignId: "",
      taskTypeId: "",
      description: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await fetch("/api/campaign-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: parseInt(data.campaignId),
          taskTypeId: parseInt(data.taskTypeId),
          description: data.description,
          isActive: true,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tarefa criada com sucesso!",
        description: "A nova tarefa foi adicionada à campanha.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campanhas", selectedCampaignId, "tarefas"] });
      form.reset({
        clientId: selectedClientId,
        campaignId: selectedCampaignId,
        taskTypeId: "",
        description: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/campaign-tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tarefa removida com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campanhas", selectedCampaignId, "tarefas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover tarefa",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  const handleClientChange = (value: string) => {
    setSelectedClientId(value);
    setSelectedCampaignId("");
    form.setValue("clientId", value);
    form.setValue("campaignId", "");
    form.setValue("taskTypeId", "");
    form.setValue("description", "");
  };

  const handleCampaignChange = (value: string) => {
    setSelectedCampaignId(value);
    form.setValue("campaignId", value);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Adicionar Tarefa Customizada</h3>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select
                    onValueChange={handleClientChange}
                    value={field.value}
                    disabled={loadingClients}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.isArray(clients) && clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedClientId && (
              <FormField
                control={form.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campanha</FormLabel>
                    <Select
                      onValueChange={handleCampaignChange}
                      value={field.value}
                      disabled={loadingCampaigns}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-campaign">
                          <SelectValue placeholder="Selecione uma campanha" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(campaigns) && campaigns.map((campaign: any) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCampaignId && (
              <>
                <FormField
                  control={form.control}
                  name="taskTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Tarefa</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingTaskTypes}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-task-type">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(taskTypes) && taskTypes.map((type: any) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da Tarefa</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Revisão de conteúdo específico"
                          data-testid="input-task-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="w-full"
                  data-testid="button-add-task"
                >
                  {createTaskMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Tarefa
                    </>
                  )}
                </Button>
              </>
            )}
          </form>
        </Form>
      </Card>

      {selectedCampaignId && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Tarefas da Campanha
          </h3>
          
          {loadingTasks ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : Array.isArray(campaignTasks) && campaignTasks.length > 0 ? (
            <div className="space-y-2">
              {campaignTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  data-testid={`task-item-${task.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.description}</p>
                    <p className="text-xs text-gray-500">
                      Tipo: {Array.isArray(taskTypes) ? taskTypes.find((t: any) => t.id === task.taskTypeId)?.name : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                    disabled={deleteTaskMutation.isPending}
                    data-testid={`button-delete-task-${task.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhuma tarefa cadastrada para esta campanha.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
