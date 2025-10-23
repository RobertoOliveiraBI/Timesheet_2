import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check, RotateCcw, Trash2, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EntradaHora {
  id: number;
  date: string;
  hours: string;
  status: string;
  clientId: number;
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

interface LinhaVisualizada {
  chave: string;
  clienteId: number;
  clienteNome: string;
  campanhaId: number;
  campanhaNome: string;
  tarefaId: number;
  tarefaNome: string;
  entradas: {
    seg: EntradaHora[];
    ter: EntradaHora[];
    qua: EntradaHora[];
    qui: EntradaHora[];
    sex: EntradaHora[];
    sab: EntradaHora[];
    dom: EntradaHora[];
  };
  totalHoras: number;
  colaboradores: string;
}

export function AprovacaoSemanal() {
  const [semanaAtual, setSemanaAtual] = useState(new Date());
  const [linhaParaAcao, setLinhaParaAcao] = useState<{ linha: LinhaVisualizada; acao: 'aprovar' | 'rascunho' | 'excluir' } | null>(null);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dataValida = semanaAtual instanceof Date && !isNaN(semanaAtual.getTime()) ? semanaAtual : new Date();
  const inicioSemana = startOfWeek(dataValida, { weekStartsOn: 1 });
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));

  const { data: entradasSemana = [], refetch: refetchEntradas } = useQuery<EntradaHora[]>({
    queryKey: ["/api/approvals/pending-week", format(inicioSemana, "yyyy-MM-dd")],
    queryFn: async () => {
      const inicioStr = format(inicioSemana, "yyyy-MM-dd");
      const fimStr = format(addDays(inicioSemana, 6), "yyyy-MM-dd");
      
      const response = await fetch(`/api/approvals/pending?fromDate=${inicioStr}&toDate=${fimStr}`, {
        credentials: "include"
      });
      
      if (!response.ok) return [];
      
      const dados = await response.json();
      return Array.isArray(dados) ? dados.filter((e: EntradaHora) => e.status === 'VALIDACAO') : [];
    },
    staleTime: 30 * 1000,
  });

  const linhasAgrupadas: LinhaVisualizada[] = (() => {
    const grupos: Record<string, LinhaVisualizada> = {};

    entradasSemana.forEach(entrada => {
      const clientId = entrada.campaign?.client?.id;
      
      if (!entrada.campaignTaskId || !clientId || !entrada.campaignId) {
        return;
      }

      const chave = `${clientId}-${entrada.campaignId}-${entrada.campaignTaskId}`;

      if (!grupos[chave]) {
        grupos[chave] = {
          chave,
          clienteId: clientId,
          clienteNome: entrada.campaign?.client?.tradeName || entrada.campaign?.client?.companyName || 'Cliente não informado',
          campanhaId: entrada.campaignId,
          campanhaNome: entrada.campaign?.name || 'Campanha não informada',
          tarefaId: entrada.campaignTaskId,
          tarefaNome: entrada.campaignTask?.description || 'Tarefa não informada',
          entradas: {
            seg: [],
            ter: [],
            qua: [],
            qui: [],
            sex: [],
            sab: [],
            dom: [],
          },
          totalHoras: 0,
          colaboradores: '',
        };
      }

      const dataEntrada = new Date(entrada.date + 'T00:00:00');
      const diaSemana = dataEntrada.getDay();
      const mapaDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const diaKey = mapaDias[diaSemana] as keyof typeof grupos[string]['entradas'];

      if (diaKey) {
        grupos[chave].entradas[diaKey].push(entrada);
      }
    });

    Object.values(grupos).forEach(linha => {
      linha.totalHoras = Object.values(linha.entradas).reduce((total, entradasDoDia) => {
        return total + entradasDoDia.reduce((subtotal, entrada) => {
          return subtotal + parseFloat(entrada.hours || "0");
        }, 0);
      }, 0);

      const colaboradoresSet = new Set<string>();
      Object.values(linha.entradas).forEach(entradasDoDia => {
        entradasDoDia.forEach(entrada => {
          if (entrada.user) {
            colaboradoresSet.add(`${entrada.user.firstName} ${entrada.user.lastName}`.trim());
          }
        });
      });
      linha.colaboradores = Array.from(colaboradoresSet).join(', ');
    });

    return Object.values(grupos);
  })();

  const calcularTotalDia = (dia: keyof LinhaVisualizada['entradas']) => {
    return linhasAgrupadas.reduce((total, linha) => {
      const horasDoDia = linha.entradas[dia].reduce((subtotal, entrada) => {
        return subtotal + parseFloat(entrada.hours || "0");
      }, 0);
      return total + horasDoDia;
    }, 0);
  };

  const calcularTotalGeral = () => {
    return linhasAgrupadas.reduce((total, linha) => total + linha.totalHoras, 0);
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

  const aprovarLinha = useMutation({
    mutationFn: async (idsEntradas: number[]) => {
      await Promise.all(
        idsEntradas.map(id => apiRequest("POST", `/api/time-entries/${id}/approve`, {}))
      );
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamentos aprovados com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending-week"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation-count"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao aprovar lançamentos",
        variant: "destructive",
      });
    },
  });

  const retornarRascunho = useMutation({
    mutationFn: async (idsEntradas: number[]) => {
      await Promise.all(
        idsEntradas.map(id => apiRequest("POST", `/api/time-entries/${id}/return-to-draft`, {}))
      );
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamentos retornados para rascunho!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending-week"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation-count"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao retornar lançamentos para rascunho",
        variant: "destructive",
      });
    },
  });

  const excluirLinha = useMutation({
    mutationFn: async (idsEntradas: number[]) => {
      await Promise.all(
        idsEntradas.map(id => apiRequest("DELETE", `/api/time-entries/${id}`, {}))
      );
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lançamentos excluídos com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending-week"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/validation-count"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir lançamentos",
        variant: "destructive",
      });
    },
  });

  const handleAcaoLinha = (linha: LinhaVisualizada, acao: 'aprovar' | 'rascunho' | 'excluir') => {
    setLinhaParaAcao({ linha, acao });
    setModalConfirmacaoAberto(true);
  };

  const confirmarAcao = () => {
    if (!linhaParaAcao) return;

    const idsEntradas = Object.values(linhaParaAcao.linha.entradas)
      .flat()
      .map(entrada => entrada.id);

    if (linhaParaAcao.acao === 'aprovar') {
      aprovarLinha.mutate(idsEntradas);
    } else if (linhaParaAcao.acao === 'rascunho') {
      retornarRascunho.mutate(idsEntradas);
    } else if (linhaParaAcao.acao === 'excluir') {
      excluirLinha.mutate(idsEntradas);
    }

    setModalConfirmacaoAberto(false);
    setLinhaParaAcao(null);
  };

  const getTituloConfirmacao = () => {
    if (!linhaParaAcao) return '';
    switch (linhaParaAcao.acao) {
      case 'aprovar':
        return 'Aprovar Lançamentos';
      case 'rascunho':
        return 'Retornar para Rascunho';
      case 'excluir':
        return 'Excluir Lançamentos';
      default:
        return '';
    }
  };

  const getDescricaoConfirmacao = () => {
    if (!linhaParaAcao) return '';
    const totalEntradas = Object.values(linhaParaAcao.linha.entradas).flat().length;
    const totalHoras = linhaParaAcao.linha.totalHoras;
    
    switch (linhaParaAcao.acao) {
      case 'aprovar':
        return `Deseja aprovar ${totalEntradas} lançamento(s) totalizando ${formatarHoras(totalHoras)} horas desta linha?`;
      case 'rascunho':
        return `Deseja retornar ${totalEntradas} lançamento(s) para rascunho? Os colaboradores poderão editar novamente.`;
      case 'excluir':
        return `Deseja excluir ${totalEntradas} lançamento(s) totalizando ${formatarHoras(totalHoras)} horas? Esta ação não pode ser desfeita.`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Aprovação Semanal</CardTitle>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navegarSemana('anterior')}
                data-testid="button-semana-anterior"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Semana Anterior
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
                Próxima Semana
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {linhasAgrupadas.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nenhum lançamento pendente nesta semana.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" data-testid="tabela-aprovacao-semanal">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-48">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-48">Campanha</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-48">Tarefa</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-48">Colaborador(es)</th>
                    {diasSemana.map((dia, idx) => (
                      <th key={idx} className="px-4 py-3 text-center text-sm font-semibold text-slate-700 w-24">
                        <div>{format(dia, "EEE", { locale: ptBR })}</div>
                        <div className="text-xs font-normal text-slate-500">{format(dia, "dd/MM")}</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700 w-24">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700 w-60">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasAgrupadas.map((linha) => (
                    <tr key={linha.chave} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`linha-aprovacao-${linha.chave}`}>
                      <td className="px-4 py-3 text-sm text-slate-900">{linha.clienteNome}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{linha.campanhaNome}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{linha.tarefaNome}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{linha.colaboradores || 'N/A'}</td>
                      {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => {
                        const diaKey = dia as keyof typeof linha.entradas;
                        const entradas = linha.entradas[diaKey];
                        const totalDia = entradas.reduce((acc, e) => acc + parseFloat(e.hours || "0"), 0);
                        return (
                          <td key={dia} className="px-4 py-3 text-center text-sm" data-testid={`celula-${linha.chave}-${dia}`}>
                            {totalDia > 0 ? (
                              <span className="font-medium text-slate-900">{formatarHoras(totalDia)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900" data-testid={`total-${linha.chave}`}>
                        {formatarHoras(linha.totalHoras)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcaoLinha(linha, 'aprovar')}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                            data-testid={`button-aprovar-${linha.chave}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcaoLinha(linha, 'rascunho')}
                            className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                            data-testid={`button-rascunho-${linha.chave}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Rascunho
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcaoLinha(linha, 'excluir')}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            data-testid={`button-excluir-${linha.chave}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-semibold">
                    <td colSpan={4} className="px-4 py-3 text-sm text-slate-900">Total Geral</td>
                    {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => {
                      const diaKey = dia as keyof LinhaVisualizada['entradas'];
                      const total = calcularTotalDia(diaKey);
                      return (
                        <td key={dia} className="px-4 py-3 text-center text-sm text-slate-900" data-testid={`total-dia-${dia}`}>
                          {total > 0 ? formatarHoras(total) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-sm text-slate-900" data-testid="total-geral">
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
