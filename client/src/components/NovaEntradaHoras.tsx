import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Building, Target, Briefcase, Save, Send, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Cliente {
  id: number;
  companyName: string;
  tradeName?: string;
}

interface Campanha {
  id: number;
  name: string;
  description?: string;
  clientId: number;
}

interface Tarefa {
  id: number;
  description: string;
  campaignId: number;
  taskTypeId: number;
}

// Opções predefinidas de horas
const opcoesDuracao = [
  { value: "0.25", label: "15 min" },
  { value: "0.5", label: "30 min" },
  { value: "0.75", label: "45 min" },
  { value: "1", label: "1h" },
  { value: "1.25", label: "1h 15min" },
  { value: "1.5", label: "1h 30min" },
  { value: "1.75", label: "1h 45min" },
  { value: "2", label: "2h" },
  { value: "2.5", label: "2h 30min" },
  { value: "3", label: "3h" },
  { value: "3.5", label: "3h 30min" },
  { value: "4", label: "4h" },
  { value: "4.5", label: "4h 30min" },
  { value: "5", label: "5h" },
  { value: "5.5", label: "5h 30min" },
  { value: "6", label: "6h" },
  { value: "6.5", label: "6h 30min" },
  { value: "7", label: "7h" },
  { value: "7.5", label: "7h 30min" },
  { value: "8", label: "8h" },
];

export function NovaEntradaHoras() {
  const [formData, setFormData] = useState({
    clienteId: "",
    campanhaId: "", 
    tarefaId: "",
    data: new Date().toISOString().split('T')[0],
    horas: "",
    descricao: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset campos dependentes quando seleção anterior muda
  const resetCamposFilhos = (nivel: 'cliente' | 'campanha') => {
    if (nivel === 'cliente') {
      setFormData(prev => ({
        ...prev,
        campanhaId: "",
        tarefaId: ""
      }));
    } else if (nivel === 'campanha') {
      setFormData(prev => ({
        ...prev,
        tarefaId: ""
      }));
    }
  };

  // Buscar clientes
  const { data: clientes = [], isLoading: clientesLoading, isError: clientesError } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });

  // Buscar campanhas do cliente selecionado
  const { data: campanhas = [], isLoading: campanhasLoading, isError: campanhasError } = useQuery<Campanha[]>({
    queryKey: ["/api/clientes", formData.clienteId, "campanhas"],
    queryFn: async () => {
      if (!formData.clienteId) return [];
      const response = await fetch(`/api/clientes/${formData.clienteId}/campanhas`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Erro ao buscar campanhas');
      return response.json();
    },
    enabled: !!formData.clienteId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Buscar tarefas da campanha selecionada
  const { data: tarefas = [], isLoading: tarefasLoading, isError: tarefasError } = useQuery<Tarefa[]>({
    queryKey: ["/api/campanhas", formData.campanhaId, "tarefas"],
    queryFn: async () => {
      if (!formData.campanhaId) return [];
      const response = await fetch(`/api/campanhas/${formData.campanhaId}/tarefas`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Erro ao buscar tarefas');
      return response.json();
    },
    enabled: !!formData.campanhaId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Mutation para salvar entrada de horas
  const criarEntradaMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/timesheet/entrada-horas", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Entrada de horas salva com sucesso",
      });
      
      // Reset do formulário
      setFormData({
        clienteId: "",
        campanhaId: "", 
        tarefaId: "",
        data: new Date().toISOString().split('T')[0],
        horas: "",
        descricao: ""
      });
      
      // Invalidar cache das entradas de tempo
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/daily"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar entrada de horas",
        variant: "destructive",
      });
    },
  });

  // Mutation para submeter para aprovação
  const submeterParaAprovacaoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/timesheet/entrada-horas", {
        ...data,
        status: "VALIDACAO"
      });
    },
    onSuccess: () => {
      toast({
        title: "Enviado para aprovação!",
        description: "Sua entrada de horas foi enviada para análise do gestor",
      });
      
      // Reset do formulário
      setFormData({
        clienteId: "",
        campanhaId: "", 
        tarefaId: "",
        data: new Date().toISOString().split('T')[0],
        horas: "",
        descricao: ""
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/daily"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar para aprovação",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (tipo: 'salvar' | 'aprovar') => {
    // Validações
    if (!formData.clienteId || !formData.campanhaId || !formData.tarefaId || !formData.data || !formData.horas) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const dadosSubmissao = {
      clientId: parseInt(formData.clienteId),
      campaignId: parseInt(formData.campanhaId),
      campaignTaskId: parseInt(formData.tarefaId),
      date: formData.data,
      hours: formData.horas,
      description: formData.descricao.trim() || null
    };

    if (tipo === 'salvar') {
      criarEntradaMutation.mutate(dadosSubmissao);
    } else {
      submeterParaAprovacaoMutation.mutate(dadosSubmissao);
    }
  };

  const isFormularioValido = formData.clienteId && formData.campanhaId && formData.tarefaId && formData.data && formData.horas;

  console.log("Nova Entrada Horas - Dados:", {
    clientes: clientes.length,
    campanhas: campanhas.length,
    tarefas: tarefas.length,
    clientesError,
    campanhasError,
    tarefasError,
    formData
  });

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Nova Entrada de Horas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção de Cliente */}
        <div className="space-y-2">
          <Label htmlFor="cliente" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Cliente *
          </Label>
          <Select
            value={formData.clienteId}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, clienteId: value }));
              resetCamposFilhos('cliente');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={clientesLoading ? "Carregando clientes..." : "Selecione um cliente"} />
            </SelectTrigger>
            <SelectContent>
              {clientesLoading ? (
                <SelectItem value="loading" disabled>Carregando...</SelectItem>
              ) : clientesError ? (
                <SelectItem value="error" disabled>Erro ao carregar clientes</SelectItem>
              ) : clientes.length > 0 ? (
                clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id.toString()}>
                    {cliente.tradeName || cliente.companyName}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-clients" disabled>Nenhum cliente disponível</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Campanha */}
        <div className="space-y-2">
          <Label htmlFor="campanha" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Campanha *
          </Label>
          <Select
            value={formData.campanhaId}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, campanhaId: value }));
              resetCamposFilhos('campanha');
            }}
            disabled={!formData.clienteId}
          >
            <SelectTrigger>
              <SelectValue 
                placeholder={
                  !formData.clienteId 
                    ? "Primeiro selecione um cliente" 
                    : campanhasLoading 
                      ? "Carregando campanhas..." 
                      : "Selecione uma campanha"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {campanhasLoading ? (
                <SelectItem value="loading" disabled>Carregando...</SelectItem>
              ) : campanhasError ? (
                <SelectItem value="error" disabled>Erro ao carregar campanhas</SelectItem>
              ) : campanhas.length > 0 ? (
                campanhas.map((campanha) => (
                  <SelectItem key={campanha.id} value={campanha.id.toString()}>
                    {campanha.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-campaigns" disabled>Nenhuma campanha disponível</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Tarefa */}
        <div className="space-y-2">
          <Label htmlFor="tarefa" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Tarefa *
          </Label>
          <Select
            value={formData.tarefaId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, tarefaId: value }))}
            disabled={!formData.campanhaId}
          >
            <SelectTrigger>
              <SelectValue 
                placeholder={
                  !formData.campanhaId 
                    ? "Primeiro selecione uma campanha" 
                    : tarefasLoading 
                      ? "Carregando tarefas..." 
                      : "Selecione uma tarefa"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {tarefasLoading ? (
                <SelectItem value="loading" disabled>Carregando...</SelectItem>
              ) : tarefasError ? (
                <SelectItem value="error" disabled>Erro ao carregar tarefas</SelectItem>
              ) : tarefas.length > 0 ? (
                tarefas.map((tarefa) => (
                  <SelectItem key={tarefa.id} value={tarefa.id.toString()}>
                    {tarefa.description}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>Nenhuma tarefa disponível</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Data e Horas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data *
            </Label>
            <Input
              type="date"
              value={formData.data}
              onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="horas" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duração *
            </Label>
            <Select
              value={formData.horas}
              onValueChange={(value) => setFormData(prev => ({ ...prev, horas: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a duração" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {opcoesDuracao.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="descricao">
            Descrição (Opcional)
          </Label>
          <Textarea
            placeholder="Descreva brevemente o trabalho realizado..."
            value={formData.descricao}
            onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
            rows={3}
          />
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => handleSubmit('salvar')}
            disabled={!isFormularioValido || criarEntradaMutation.isPending}
            variant="outline"
            className="flex-1"
          >
            {criarEntradaMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Rascunho
          </Button>

          <Button
            onClick={() => handleSubmit('aprovar')}
            disabled={!isFormularioValido || submeterParaAprovacaoMutation.isPending}
            className="flex-1"
          >
            {submeterParaAprovacaoMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar para Aprovação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}