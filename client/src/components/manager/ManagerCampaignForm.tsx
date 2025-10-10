import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const campaignFormSchema = z.object({
  name: z.string().min(1, "Nome da campanha é obrigatório"),
  description: z.string().optional(),
  clientId: z.number({ required_error: "Cliente é obrigatório" }),
  costCenterId: z.number().optional().nullable(),
  contractValue: z.string().optional().nullable(),
  contractStartDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface ManagerCampaignFormProps {
  onSuccess?: () => void;
}

export function ManagerCampaignForm({ onSuccess }: ManagerCampaignFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clientes'],
  });

  const { data: costCenters = [] } = useQuery<any[]>({
    queryKey: ['/api/cost-centers'],
  });

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: undefined,
      costCenterId: null,
      contractValue: null,
      contractStartDate: null,
      contractEndDate: null,
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      return apiRequest("POST", "/api/manager/campaigns", data);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Sucesso!",
        description: response.message || "Campanha cadastrada com sucesso.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar campanha.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignFormValues) => {
    createCampaignMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar Nova Campanha</CardTitle>
        <CardDescription>
          Preencha os dados da campanha. Campos com <span className="text-red-500">*</span> são obrigatórios.
          <br />
          <span className="text-sm text-muted-foreground">
            Tarefas padrão serão criadas automaticamente com base nos tipos de tarefa cadastrados.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      Nome da Campanha <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Cliente <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-clientId">
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
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

              <FormField
                control={form.control}
                name="costCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Custo</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-costCenterId">
                          <SelectValue placeholder="Selecione o centro de custo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {costCenters.map((cc: any) => (
                          <SelectItem key={cc.id} value={cc.id.toString()}>
                            {cc.name} - {cc.code}
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
                name="contractValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Mensal do Contrato (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-contractValue"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-contractStartDate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fim</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-contractEndDate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                data-testid="button-cancel"
              >
                Limpar
              </Button>
              <Button
                type="submit"
                disabled={createCampaignMutation.isPending}
                data-testid="button-submit"
              >
                {createCampaignMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cadastrar Campanha
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
