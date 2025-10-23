import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Eye, Edit, Trash2, RefreshCw } from "lucide-react";
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
}

const opcoesDuracao = [
  "0", "0.25", "0.5", "0.75", "1", "1.25", "1.5", "1.75", "2", "2.25", "2.5", "2.75", 
  "3", "3.25", "3.5", "3.75", "4", "4.25", "4.5", "4.75", "5", "5.25", "5.5", "5.75", 
  "6", "6.25", "6.5", "6.75", "7", "7.25", "7.5", "7.75", "8"
];

interface VisualizacaoSemanalProps {
  semanaAtual: Date;
  onSemanaChange: (direcao: 'anterior' | 'proxima') => void;
}

export function VisualizacaoSemanal({ semanaAtual, onSemanaChange }: VisualizacaoSemanalProps) {
  const [entradaEditando, setEntradaEditando] = useState<EntradaHora | null>(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [horasEditando, setHorasEditando] = useState("");
  const [entradaParaExcluir, setEntradaParaExcluir] = useState<EntradaHora | null>(null);
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Garantir que semanaAtual seja uma data válida
  const dataValida = semanaAtual instanceof Date && !isNaN(semanaAtual.getTime()) ? semanaAtual : new Date();

  // Calcular dias da semana (segunda a domingo)
  const inicioSemana = startOfWeek(dataValida, { weekStartsOn: 1 });
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));

  // Buscar entradas da semana
  const { data: entradasSemana = [], refetch: refetchEntradas } = useQuery<EntradaHora[]>({
    queryKey: ["/api/timesheet/visualizacao-semana", format(inicioSemana, "yyyy-MM-dd")],
    queryFn: async () => {
      const inicioStr = format(inicioSemana, "yyyy-MM-dd");
      const fimStr = format(addDays(inicioSemana, 6), "yyyy-MM-dd");
      
      const response = await fetch(`/api/time-entries/user?fromDate=${inicioStr}&toDate=${fimStr}`, {
        credentials: "include"
      });
      
      if (!response.ok) return [];
      
      return await response.json();
    },
    staleTime: 30 * 1000,
  });

  // Agrupar entradas por linha (cliente + campanha + tarefa)
  const linhasAgrupadas: LinhaVisualizada[] = (() => {
    const grupos: Record<string, LinhaVisualizada> = {};

    entradasSemana.forEach(entrada => {
      if (!entrada.campaignTaskId || !entrada.clientId || !entrada.campaignId) return;

      const chave = `${entrada.clientId}-${entrada.campaignId}-${entrada.campaignTaskId}`;

      if (!grupos[chave]) {
        grupos[chave] = {
          chave,
          clienteId: entrada.clientId,
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
        };
      }

      const dataEntrada = new Date(entrada.date);
      const diaSemana = dataEntrada.getDay();
      const mapaDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const diaKey = mapaDias[diaSemana] as keyof typeof grupos[string]['entradas'];

      if (diaKey) {
        grupos[chave].entradas[diaKey].push(entrada);
      }
    });

    // Calcular total de horas por linha
    Object.values(grupos).forEach(linha => {
      linha.totalHoras = Object.values(linha.entradas).reduce((total, entradasDoDia) => {
        return total + entradasDoDia.reduce((subtotal, entrada) => {
          return subtotal + parseFloat(entrada.hours || "0");
        }, 0);
      }, 0);
    });

    return Object.values(grupos);
  })();

  // Calcular totais por dia
  const calcularTotalDia = (dia: keyof LinhaVisualizada['entradas']) => {
    return linhasAgrupadas.reduce((total, linha) => {
      const horasDoDia = linha.entradas[dia].reduce((subtotal, entrada) => {
        return subtotal + parseFloat(entrada.hours || "0");
      }, 0);
      return total + horasDoDia;
    }, 0);
  };

  // Calcular total geral
  const calcularTotalGeral = () => {
    return linhasAgrupadas.reduce((total, linha) => total + linha.totalHoras, 0);
  };

  // Formatação de data para exibição
  const formatarDataSemana = () => {
    const inicio = format(diasSemana[0], "dd/MM", { locale: ptBR });
    const fim = format(diasSemana[6], "dd/MM/yyyy", { locale: ptBR });
    return `${inicio} - ${fim}`;
  };

  // Abrir modal de edição
  const abrirModalEdicao = (entrada: EntradaHora) => {
    setEntradaEditando(entrada);
    setHorasEditando(entrada.hours);
    setModalEdicaoAberto(true);
  };

  // Fechar modal de edição
  const fecharModalEdicao = () => {
    setEntradaEditando(null);
    setHorasEditando("");
    setModalEdicaoAberto(false);
  };

  // Abrir modal de exclusão
  const abrirModalExclusao = (entrada: EntradaHora) => {
    setEntradaParaExcluir(entrada);
    setModalExclusaoAberto(true);
  };

  // Mutation para editar entrada
  const editarEntrada = useMutation({
    mutationFn: async () => {
      if (!entradaEditando) return;
      
      await apiRequest("PATCH", `/api/time-entries/${entradaEditando.id}`, {
        hours: horasEditando
      });
    },
    onSuccess: async () => {
      toast({
        title: "Sucesso!",
        description: "Entrada editada com sucesso",
      });
      
      fecharModalEdicao();
      
      // Atualizar todas as queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/timesheet/visualizacao-semana"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/timesheet/semana"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/mensal"] }),
        refetchEntradas()
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao editar entrada",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir entrada
  const excluirEntrada = useMutation({
    mutationFn: async (entradaId: number) => {
      await apiRequest("DELETE", `/api/time-entries/${entradaId}`);
    },
    onSuccess: async () => {
      toast({
        title: "Sucesso!",
        description: "Entrada excluída com sucesso",
      });
      
      setModalExclusaoAberto(false);
      setEntradaParaExcluir(null);
      
      // Atualizar todas as queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/timesheet/visualizacao-semana"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/timesheet/semana"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/mensal"] }),
        refetchEntradas()
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir entrada",
        variant: "destructive",
      });
    },
  });

  // Confirmar exclusão
  const confirmarExclusao = () => {
    if (entradaParaExcluir) {
      excluirEntrada.mutate(entradaParaExcluir.id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visualização Semanal
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSemanaChange('anterior')}
                data-testid="button-semana-anterior-vis"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {formatarDataSemana()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSemanaChange('proxima')}
                data-testid="button-semana-proxima-vis"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchEntradas()}
                title="Atualizar visualização"
                data-testid="button-atualizar-vis"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-3 text-left font-semibold">Cliente</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">Campanha</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">Tarefa</th>
                  {diasSemana.map((dia, index) => (
                    <th key={index} className="border border-gray-300 p-3 text-center font-semibold">
                      <div className="text-xs text-gray-500">
                        {format(dia, "EEE", { locale: ptBR })}
                      </div>
                      <div className="text-sm">
                        {format(dia, "dd/MM")}
                      </div>
                    </th>
                  ))}
                  <th className="border border-gray-300 p-3 text-center font-semibold">Total</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhasAgrupadas.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="border border-gray-300 p-8 text-center text-gray-500">
                      Nenhuma entrada de horas encontrada para esta semana
                    </td>
                  </tr>
                ) : (
                  <>
                    {linhasAgrupadas.map((linha) => (
                      <tr key={linha.chave} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2 text-sm">{linha.clienteNome}</td>
                        <td className="border border-gray-300 p-2 text-sm">{linha.campanhaNome}</td>
                        <td className="border border-gray-300 p-2 text-sm">{linha.tarefaNome}</td>
                        {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => {
                          const diaKey = dia as keyof typeof linha.entradas;
                          const entradasDoDia = linha.entradas[diaKey];
                          
                          return (
                            <td 
                              key={dia} 
                              className="border border-gray-300 p-2 text-center align-top"
                            >
                              {entradasDoDia.length > 0 ? (
                                <div className="space-y-1">
                                  {entradasDoDia.map((entrada) => (
                                    <div 
                                      key={entrada.id} 
                                      className="flex items-center justify-center gap-1 bg-blue-50 rounded px-2 py-1"
                                    >
                                      <span className="font-medium text-sm">{parseFloat(entrada.hours).toFixed(2)}h</span>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 hover:bg-blue-100"
                                          onClick={() => abrirModalEdicao(entrada)}
                                          data-testid={`button-editar-${entrada.id}`}
                                        >
                                          <Edit className="h-3 w-3 text-blue-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 text-red-600 hover:bg-red-100"
                                          onClick={() => abrirModalExclusao(entrada)}
                                          data-testid={`button-excluir-${entrada.id}`}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border border-gray-300 p-2 text-center font-medium">
                          {linha.totalHoras.toFixed(2)}h
                        </td>
                        <td className="border border-gray-300 p-2 text-center">
                          <span className="text-xs text-gray-500">-</span>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Linha de totais */}
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={3} className="border border-gray-300 p-3 text-right">
                        Total Geral:
                      </td>
                      {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => (
                        <td key={dia} className="border border-gray-300 p-3 text-center">
                          {calcularTotalDia(dia as keyof LinhaVisualizada['entradas']).toFixed(2)}h
                        </td>
                      ))}
                      <td className="border border-gray-300 p-3 text-center">
                        {calcularTotalGeral().toFixed(2)}h
                      </td>
                      <td className="border border-gray-300 p-3"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de edição */}
      <Dialog open={modalEdicaoAberto} onOpenChange={setModalEdicaoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entrada de Horas</DialogTitle>
          </DialogHeader>
          {entradaEditando && (
            <div className="space-y-4">
              <div>
                <Label>Data</Label>
                <p className="text-sm text-gray-700">
                  {format(new Date(entradaEditando.date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <Label>Cliente</Label>
                <p className="text-sm text-gray-700">
                  {entradaEditando.campaign?.client?.tradeName || entradaEditando.campaign?.client?.companyName}
                </p>
              </div>
              <div>
                <Label>Campanha</Label>
                <p className="text-sm text-gray-700">{entradaEditando.campaign?.name}</p>
              </div>
              <div>
                <Label>Tarefa</Label>
                <p className="text-sm text-gray-700">{entradaEditando.campaignTask?.description}</p>
              </div>
              <div>
                <Label htmlFor="horas-edicao">Horas</Label>
                <Select value={horasEditando} onValueChange={setHorasEditando}>
                  <SelectTrigger id="horas-edicao" data-testid="select-horas-edicao">
                    <SelectValue placeholder="Selecione as horas" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {opcoesDuracao.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>
                        {opcao}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={fecharModalEdicao} data-testid="button-cancelar-edicao">
                  Cancelar
                </Button>
                <Button 
                  onClick={() => editarEntrada.mutate()} 
                  disabled={editarEntrada.isPending}
                  data-testid="button-salvar-edicao"
                >
                  {editarEntrada.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={modalExclusaoAberto} onOpenChange={setModalExclusaoAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entrada de horas? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancelar-exclusao">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusao}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirmar-exclusao"
            >
              {excluirEntrada.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
