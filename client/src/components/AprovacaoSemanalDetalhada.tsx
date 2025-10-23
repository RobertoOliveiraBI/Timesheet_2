import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check, RotateCcw, Trash2, RefreshCw, CheckCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EntradaHora {
  id: number;
  userId: number;
  date: string;
  hours: string;
  status: 'RASCUNHO' | 'SALVO' | 'VALIDACAO' | 'APROVADO' | 'REJEITADO';
  campaignId: number;
  campaignTaskId: number;
  campaign?: {
    id: number;
    name: string;
    client?: {
      id: number;
      companyName: string;
      tradeName?: string;
    };
  };
  campaignTask?: {
    id: number;
    description: string;
  };
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface Colaborador {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface LinhaTabela {
  chave: string;
  colaboradorNome: string;
  clienteNome: string;
  campanhaNome: string;
  tarefaNome: string;
  entradas: {
    seg?: EntradaHora;
    ter?: EntradaHora;
    qua?: EntradaHora;
    qui?: EntradaHora;
    sex?: EntradaHora;
    sab?: EntradaHora;
    dom?: EntradaHora;
  };
  totalHoras: number;
}

type AcaoLote = 
  | { tipo: 'entrada'; entrada: EntradaHora; acao: 'aprovar' | 'rascunho' | 'excluir' }
  | { tipo: 'linha'; linha: LinhaTabela }
  | { tipo: 'semana' };

export function AprovacaoSemanalDetalhada() {
  const [semanaAtual, setSemanaAtual] = useState(new Date());
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<string>("");
  const [acaoParaConfirmar, setAcaoParaConfirmar] = useState<AcaoLote | null>(null);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dataValida = semanaAtual instanceof Date && !isNaN(semanaAtual.getTime()) ? semanaAtual : new Date();
  const inicioSemana = startOfWeek(dataValida, { weekStartsOn: 1 });
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));

  // Buscar usuário atual
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });

  // Buscar colaboradores da equipe do gestor
  const { data: colaboradores = [] } = useQuery<Colaborador[]>({
    queryKey: ["/api/users/team", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const response = await fetch("/api/users", {
        credentials: "include"
      });
      
      if (!response.ok) return [];
      
      const todosUsuarios = await response.json();
      
      // Filtrar apenas colaboradores da equipe do gestor logado
      if (currentUser.role === 'GESTOR') {
        return todosUsuarios.filter((u: Colaborador) => 
          u.id !== currentUser.id && 
          (u as any).managerId === currentUser.id
        );
      }
      
      // MASTER e ADMIN veem todos os usuários
      return todosUsuarios.filter((u: Colaborador) => u.id !== currentUser.id);
    },
    enabled: !!currentUser,
  });

  // Selecionar automaticamente o primeiro colaborador quando a lista carregar
  useEffect(() => {
    if (colaboradores.length > 0 && !colaboradorSelecionado) {
      setColaboradorSelecionado(colaboradores[0].id.toString());
    }
  }, [colaboradores, colaboradorSelecionado]);

  // Buscar entradas da semana do colaborador selecionado
  const { data: entradasSemana = [], refetch: refetchEntradas } = useQuery<EntradaHora[]>({
    queryKey: ["/api/approvals/pending-week-detailed", format(inicioSemana, "yyyy-MM-dd"), colaboradorSelecionado],
    queryFn: async () => {
      if (!colaboradorSelecionado) return [];
      
      const inicioStr = format(inicioSemana, "yyyy-MM-dd");
      const fimStr = format(addDays(inicioSemana, 6), "yyyy-MM-dd");
      
      // Buscar todas as entradas do colaborador na semana (não apenas VALIDACAO)
      const response = await fetch(`/api/approvals/pending?fromDate=${inicioStr}&toDate=${fimStr}&userId=${colaboradorSelecionado}`, {
        credentials: "include"
      });
      
      if (!response.ok) return [];
      
      const dados = await response.json();
      return Array.isArray(dados) ? dados : [];
    },
    enabled: !!colaboradorSelecionado,
    staleTime: 30 * 1000,
  });

  // Agrupar entradas em linhas da tabela
  const linhasTabela: LinhaTabela[] = (() => {
    const grupos: Record<string, LinhaTabela> = {};

    entradasSemana.slice(0, 100).forEach(entrada => {
      const clientId = entrada.campaign?.client?.id;
      
      if (!entrada.campaignTaskId || !clientId || !entrada.campaignId) {
        return;
      }

      const chave = `${entrada.userId}-${clientId}-${entrada.campaignId}-${entrada.campaignTaskId}`;

      if (!grupos[chave]) {
        grupos[chave] = {
          chave,
          colaboradorNome: `${entrada.user?.firstName || ''} ${entrada.user?.lastName || ''}`.trim(),
          clienteNome: entrada.campaign?.client?.tradeName || entrada.campaign?.client?.companyName || 'Cliente não informado',
          campanhaNome: entrada.campaign?.name || 'Campanha não informada',
          tarefaNome: entrada.campaignTask?.description || 'Tarefa não informada',
          entradas: {},
          totalHoras: 0,
        };
      }

      const dataEntrada = new Date(entrada.date + 'T00:00:00');
      const diaSemana = dataEntrada.getDay();
      const mapaDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const diaKey = mapaDias[diaSemana] as keyof typeof grupos[string]['entradas'];

      if (diaKey) {
        grupos[chave].entradas[diaKey] = entrada;
      }
    });

    // Calcular total de horas por linha
    Object.values(grupos).forEach(linha => {
      linha.totalHoras = Object.values(linha.entradas).reduce((total, entrada) => {
        return total + parseFloat(entrada?.hours || "0");
      }, 0);
    });

    return Object.values(grupos);
  })();

  const calcularTotalDia = (dia: keyof LinhaTabela['entradas']) => {
    return linhasTabela.reduce((total, linha) => {
      const entrada = linha.entradas[dia];
      return total + parseFloat(entrada?.hours || "0");
    }, 0);
  };

  const calcularTotalGeral = () => {
    return linhasTabela.reduce((total, linha) => total + linha.totalHoras, 0);
  };

  const formatarHoras = (horas: number) => {
    return horas.toFixed(2).replace('.', ',');
  };

  const navegarSemana = (direcao: 'anterior' | 'proxima') => {
    setSemanaAtual(prev => {
      const dataValida = prev instanceof Date && !isNaN(prev.getTime()) ? prev : new Date();
      return direcao === 'anterior' ? subWeeks(dataValida, 1) : addWeeks(dataValida, 1);
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RASCUNHO':
        return { letra: 'R', cor: 'bg-slate-200 text-slate-700', texto: 'Rascunho' };
      case 'SALVO':
      case 'VALIDACAO':
        return { letra: 'E', cor: 'bg-amber-200 text-amber-800', texto: 'Enviado' };
      case 'APROVADO':
        return { letra: 'A', cor: 'bg-green-200 text-green-800', texto: 'Aprovado' };
      default:
        return { letra: 'R', cor: 'bg-slate-200 text-slate-700', texto: 'Rascunho' };
    }
  };

  // Obter IDs de entradas para aprovar em lote
  const getEntradasParaAprovarLinha = (linha: LinhaTabela): number[] => {
    const ids: number[] = [];
    Object.values(linha.entradas).forEach(entrada => {
      if (entrada && entrada.status === 'VALIDACAO') {
        ids.push(entrada.id);
      }
    });
    return ids;
  };

  const getEntradasParaAprovarSemana = (): number[] => {
    const ids: number[] = [];
    entradasSemana.forEach(entrada => {
      if (entrada.status === 'VALIDACAO') {
        ids.push(entrada.id);
      }
    });
    return ids;
  };

  const aprovarEntrada = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/time-entries/${id}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento aprovado!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending-week-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation-count"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao aprovar lançamento",
        variant: "destructive",
      });
    },
  });

  const aprovarLote = useMutation({
    mutationFn: async (ids: number[]) => {
      // Aprovar cada entrada sequencialmente
      for (const id of ids) {
        await apiRequest("POST", `/api/time-entries/${id}/approve`, {});
      }
    },
    onSuccess: (_, ids) => {
      toast({
        title: "Sucesso",
        description: `${ids.length} lançamento(s) aprovado(s)!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending-week-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation-count"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao aprovar lançamentos em lote",
        variant: "destructive",
      });
    },
  });

  const retornarRascunho = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/time-entries/${id}/return-to-draft`, {});
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento retornado para rascunho!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending-week-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation-count"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao retornar lançamento para rascunho",
        variant: "destructive",
      });
    },
  });

  const excluirEntrada = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/time-entries/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamento excluído!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending-week-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation-count"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir lançamento",
        variant: "destructive",
      });
    },
  });

  const handleAcaoEntrada = (entrada: EntradaHora, acao: 'aprovar' | 'rascunho' | 'excluir') => {
    setAcaoParaConfirmar({ tipo: 'entrada', entrada, acao });
    setModalConfirmacaoAberto(true);
  };

  const handleAprovarLinha = (linha: LinhaTabela) => {
    const ids = getEntradasParaAprovarLinha(linha);
    if (ids.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum lançamento pendente de aprovação nesta linha",
        variant: "destructive",
      });
      return;
    }
    setAcaoParaConfirmar({ tipo: 'linha', linha });
    setModalConfirmacaoAberto(true);
  };

  const handleAprovarSemana = () => {
    const ids = getEntradasParaAprovarSemana();
    if (ids.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum lançamento pendente de aprovação nesta semana",
        variant: "destructive",
      });
      return;
    }
    setAcaoParaConfirmar({ tipo: 'semana' });
    setModalConfirmacaoAberto(true);
  };

  const confirmarAcao = () => {
    if (!acaoParaConfirmar) return;

    if (acaoParaConfirmar.tipo === 'entrada') {
      const { entrada, acao } = acaoParaConfirmar;
      if (acao === 'aprovar') {
        aprovarEntrada.mutate(entrada.id);
      } else if (acao === 'rascunho') {
        retornarRascunho.mutate(entrada.id);
      } else if (acao === 'excluir') {
        excluirEntrada.mutate(entrada.id);
      }
    } else if (acaoParaConfirmar.tipo === 'linha') {
      const ids = getEntradasParaAprovarLinha(acaoParaConfirmar.linha);
      aprovarLote.mutate(ids);
    } else if (acaoParaConfirmar.tipo === 'semana') {
      const ids = getEntradasParaAprovarSemana();
      aprovarLote.mutate(ids);
    }

    setModalConfirmacaoAberto(false);
    setAcaoParaConfirmar(null);
  };

  const getTituloConfirmacao = () => {
    if (!acaoParaConfirmar) return '';
    
    if (acaoParaConfirmar.tipo === 'entrada') {
      const { acao } = acaoParaConfirmar;
      switch (acao) {
        case 'aprovar':
          return 'Aprovar Lançamento';
        case 'rascunho':
          return 'Retornar para Rascunho';
        case 'excluir':
          return 'Excluir Lançamento';
        default:
          return '';
      }
    } else if (acaoParaConfirmar.tipo === 'linha') {
      return 'Aprovar Linha Completa';
    } else if (acaoParaConfirmar.tipo === 'semana') {
      return 'Aprovar Semana Completa';
    }
    return '';
  };

  const getDescricaoConfirmacao = () => {
    if (!acaoParaConfirmar) return '';
    
    if (acaoParaConfirmar.tipo === 'entrada') {
      const { entrada, acao } = acaoParaConfirmar;
      const horas = entrada.hours;
      
      switch (acao) {
        case 'aprovar':
          return `Deseja aprovar este lançamento de ${formatarHoras(parseFloat(horas))} horas?`;
        case 'rascunho':
          return `Deseja retornar este lançamento para rascunho? O colaborador poderá editá-lo novamente.`;
        case 'excluir':
          return `Deseja excluir este lançamento de ${formatarHoras(parseFloat(horas))} horas? Esta ação não pode ser desfeita.`;
        default:
          return '';
      }
    } else if (acaoParaConfirmar.tipo === 'linha') {
      const ids = getEntradasParaAprovarLinha(acaoParaConfirmar.linha);
      const totalHoras = ids.reduce((sum, id) => {
        const entrada = entradasSemana.find(e => e.id === id);
        return sum + parseFloat(entrada?.hours || "0");
      }, 0);
      return `Deseja aprovar todos os ${ids.length} lançamento(s) desta linha (total de ${formatarHoras(totalHoras)} horas)?`;
    } else if (acaoParaConfirmar.tipo === 'semana') {
      const ids = getEntradasParaAprovarSemana();
      const totalHoras = ids.reduce((sum, id) => {
        const entrada = entradasSemana.find(e => e.id === id);
        return sum + parseFloat(entrada?.hours || "0");
      }, 0);
      return `Deseja aprovar todos os ${ids.length} lançamento(s) pendentes desta semana (total de ${formatarHoras(totalHoras)} horas)?`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Visualização Semanal</CardTitle>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Colaborador:</label>
                <Select value={colaboradorSelecionado} onValueChange={setColaboradorSelecionado}>
                  <SelectTrigger className="w-[250px]" data-testid="select-colaborador">
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((colab) => (
                      <SelectItem key={colab.id} value={colab.id.toString()}>
                        {`${colab.firstName} ${colab.lastName}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navegarSemana('anterior')}
                data-testid="button-semana-anterior"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm font-medium">
                {format(diasSemana[0], "dd/MM", { locale: ptBR })} - {format(diasSemana[6], "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navegarSemana('proxima')}
                data-testid="button-proxima-semana"
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchEntradas()}
                data-testid="button-atualizar"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Atualizar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAprovarSemana}
                disabled={getEntradasParaAprovarSemana().length === 0}
                data-testid="button-aprovar-semana"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Aprovar Semana
              </Button>
            </div>
          </div>
          {linhasTabela.length >= 100 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
              <strong>Atenção:</strong> Exibindo limite de 100 linhas. Filtre um colaborador por vez para melhor desempenho.
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!colaboradorSelecionado ? (
            <div className="text-center py-12 text-slate-500">
              Selecione um colaborador para visualizar os lançamentos.
            </div>
          ) : linhasTabela.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nenhum lançamento encontrado para este colaborador nesta semana.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" data-testid="tabela-aprovacao-detalhada">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 w-32">Colaborador</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 w-40">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 w-40">Campanha</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 w-40">Tarefa</th>
                    {diasSemana.map((dia, idx) => (
                      <th key={idx} className="px-3 py-2 text-center text-xs font-semibold text-slate-700 w-24">
                        <div>{format(dia, "EEE", { locale: ptBR })}</div>
                        <div className="text-xs font-normal text-slate-500">{format(dia, "dd/MM")}</div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 w-20">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 w-32">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasTabela.map((linha) => {
                    const idsParaAprovar = getEntradasParaAprovarLinha(linha);
                    return (
                      <tr key={linha.chave} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`linha-${linha.chave}`}>
                        <td className="px-3 py-2 text-xs text-slate-900">{linha.colaboradorNome}</td>
                        <td className="px-3 py-2 text-xs text-slate-900">{linha.clienteNome}</td>
                        <td className="px-3 py-2 text-xs text-slate-900">{linha.campanhaNome}</td>
                        <td className="px-3 py-2 text-xs text-slate-900">{linha.tarefaNome}</td>
                        {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => {
                          const diaKey = dia as keyof typeof linha.entradas;
                          const entrada = linha.entradas[diaKey];
                          const status = entrada ? getStatusBadge(entrada.status) : null;
                          
                          return (
                            <td key={dia} className="px-3 py-2 text-center" data-testid={`celula-${linha.chave}-${dia}`}>
                              {entrada ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-slate-900">{formatarHoras(parseFloat(entrada.hours))}</span>
                                    <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded ${status?.cor}`} title={status?.texto}>
                                      {status?.letra}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    {entrada.status === 'VALIDACAO' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleAcaoEntrada(entrada, 'aprovar')}
                                        className="h-6 w-6 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                                        title="Aprovar"
                                        data-testid={`button-aprovar-${entrada.id}`}
                                      >
                                        <Check className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {entrada.status === 'APROVADO' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleAcaoEntrada(entrada, 'rascunho')}
                                        className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                        title="Retornar para rascunho"
                                        data-testid={`button-rascunho-${entrada.id}`}
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {entrada.status !== 'APROVADO' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleAcaoEntrada(entrada, 'excluir')}
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                        title="Excluir"
                                        data-testid={`button-excluir-${entrada.id}`}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center text-xs font-semibold text-slate-900" data-testid={`total-${linha.chave}`}>
                          {formatarHoras(linha.totalHoras)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAprovarLinha(linha)}
                            disabled={idsParaAprovar.length === 0}
                            className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            title={`Aprovar ${idsParaAprovar.length} lançamento(s)`}
                            data-testid={`button-aprovar-linha-${linha.chave}`}
                          >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Aprovar ({idsParaAprovar.length})
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-semibold">
                    <td colSpan={4} className="px-3 py-2 text-xs text-slate-900">Total Geral</td>
                    {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => {
                      const diaKey = dia as keyof LinhaTabela['entradas'];
                      const total = calcularTotalDia(diaKey);
                      return (
                        <td key={dia} className="px-3 py-2 text-center text-xs text-slate-900" data-testid={`total-dia-${dia}`}>
                          {total > 0 ? formatarHoras(total) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center text-xs text-slate-900" data-testid="total-geral">
                      {formatarHoras(calcularTotalGeral())}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={modalConfirmacaoAberto} onOpenChange={setModalConfirmacaoAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getTituloConfirmacao()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getDescricaoConfirmacao()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancelar-acao">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAcao} data-testid="button-confirmar-acao">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
