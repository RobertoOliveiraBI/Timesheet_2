import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Send, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Cliente {
  id: number;
  companyName: string;
  tradeName?: string;
}

interface Campanha {
  id: number;
  name: string;
  clientId: number;
}

interface Tarefa {
  id: number;
  description: string;
  campaignId: number;
}

interface LinhaTimesheet {
  id: string;
  clienteId: string;
  clienteNome: string;
  campanhaId: string;
  campanhaNome: string;
  tarefaId: string;
  tarefaNome: string;
  horas: {
    [dia: string]: string; // seg: "2.5", ter: "3.0", etc.
  };
  totalHoras: number;
}

const opcoesDuracao = [
  "0", "0.25", "0.5", "0.75", "1", "1.25", "1.5", "1.75", "2", "2.25", "2.5", "2.75", 
  "3", "3.25", "3.5", "3.75", "4", "4.25", "4.5", "4.75", "5", "5.25", "5.5", "5.75", 
  "6", "6.25", "6.5", "6.75", "7", "7.25", "7.5", "7.75", "8"
];

export function TimesheetSemanal() {
  const [semanaAtual, setSemanaAtual] = useState(new Date());
  const [linhas, setLinhas] = useState<LinhaTimesheet[]>([]);
  const [campanhasPorCliente, setCampanhasPorCliente] = useState<Record<string, Campanha[]>>({});
  const [tarefasPorCampanha, setTarefasPorCampanha] = useState<Record<string, Tarefa[]>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calcular dias da semana (segunda a sábado)
  const inicioSemana = startOfWeek(semanaAtual, { weekStartsOn: 1 }); // Segunda-feira
  const diasSemana = Array.from({ length: 6 }, (_, i) => addDays(inicioSemana, i));

  // Buscar clientes
  const { data: clientes = [], isLoading: clientesLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
    staleTime: 5 * 60 * 1000,
  });

  // Buscar entradas existentes da semana
  const { data: entradasExistentes = [], refetch: refetchEntradas } = useQuery({
    queryKey: ["/api/timesheet/semana", format(inicioSemana, "yyyy-MM-dd"), format(addDays(inicioSemana, 5), "yyyy-MM-dd")],
    queryFn: async () => {
      try {
        const url = `/api/timesheet/semana?inicioSemana=${format(inicioSemana, "yyyy-MM-dd")}&fimSemana=${format(addDays(inicioSemana, 5), "yyyy-MM-dd")}`;
        console.log("Buscando entradas da semana:", url);
        
        const response = await fetch(url, { credentials: "include" });
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          console.log("Response não OK, retornando array vazio");
          return [];
        }
        
        const data = await response.json();
        console.log("Dados recebidos da API:", data);
        return data;
      } catch (error) {
        console.error("Erro ao buscar entradas:", error);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // Carregar entradas existentes quando dados chegam
  useEffect(() => {
    carregarEntradasExistentes();
  }, [entradasExistentes]);

  // Converter entradas do servidor para formato de linhas
  const carregarEntradasExistentes = useCallback(async () => {
    console.log("carregarEntradasExistentes chamada", { 
      entradasLength: entradasExistentes?.length 
    });

    if (!entradasExistentes || !Array.isArray(entradasExistentes) || entradasExistentes.length === 0) {
      // Se não há entradas salvas, limpar linhas da semana anterior
      console.log("Nenhuma entrada existente, limpando linhas");
      setLinhas([]);
      return;
    }

    console.log("Processando entradas existentes...", entradasExistentes);

    const linhasAgrupadas: Record<string, LinhaTimesheet> = {};

    // Agrupar entradas por tarefa
    for (const entrada of entradasExistentes) {
      if (!entrada || !entrada.campaignTaskId || !entrada.clientId || !entrada.campaignId) continue;
      
      const chave = `${entrada.campaignTaskId}-${entrada.clientId}-${entrada.campaignId}`;
      
      if (!linhasAgrupadas[chave]) {
        // Usar dados que já vêm da API com join
        const clienteNome = entrada.campaign?.client?.tradeName || 
                          entrada.campaign?.client?.companyName || 
                          `Cliente ${entrada.clientId}`;
        const campanhaNome = entrada.campaign?.name || `Campanha ${entrada.campaignId}`;
        const tarefaNome = entrada.campaignTask?.description || `Tarefa ${entrada.campaignTaskId}`;

        console.log("Criando linha com dados:", { 
          clienteNome, 
          campanhaNome, 
          tarefaNome,
          entrada 
        });
        
        linhasAgrupadas[chave] = {
          id: chave,
          clienteId: entrada.clientId.toString(),
          clienteNome,
          campanhaId: entrada.campaignId.toString(),
          campanhaNome,
          tarefaId: entrada.campaignTaskId.toString(),
          tarefaNome,
          horas: {
            seg: "0",
            ter: "0",
            qua: "0", 
            qui: "0",
            sex: "0",
            sab: "0"
          },
          totalHoras: 0
        };
      }

      // Mapear dia da semana
      const dataEntrada = new Date(entrada.date);
      const diaSemana = dataEntrada.getDay();
      const mapaDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const diaKey = mapaDias[diaSemana];
      
      if (diaKey && diaKey !== 'dom') {
        linhasAgrupadas[chave].horas[diaKey] = entrada.hours.toString();
      }
    }

    // Recalcular totais
    Object.values(linhasAgrupadas).forEach(linha => {
      linha.totalHoras = Object.values(linha.horas).reduce((total, horas) => {
        return total + parseFloat(horas || "0");
      }, 0);
    });

    // Combinar com linhas não salvas existentes
    const linhasNaoSalvas = linhas.filter(linha => 
      !Object.keys(linhasAgrupadas).includes(linha.id) && 
      (linha.clienteId || linha.campanhaId || linha.tarefaId || 
       Object.values(linha.horas).some(h => parseFloat(h || "0") > 0))
    );

    setLinhas([...Object.values(linhasAgrupadas), ...linhasNaoSalvas]);
  }, [entradasExistentes]);

  // Navegação de semanas
  const navegarSemana = (direcao: 'anterior' | 'proxima') => {
    if (direcao === 'anterior') {
      setSemanaAtual(subWeeks(semanaAtual, 1));
    } else {
      setSemanaAtual(addWeeks(semanaAtual, 1));
    }
    // Não limpar linhas - deixar que o carregamento das entradas gerencie isso
  };

  // Adicionar nova linha
  const adicionarLinha = () => {
    const novaLinha: LinhaTimesheet = {
      id: `linha-${Date.now()}`,
      clienteId: "",
      clienteNome: "",
      campanhaId: "",
      campanhaNome: "",
      tarefaId: "",
      tarefaNome: "",
      horas: {
        seg: "0",
        ter: "0", 
        qua: "0",
        qui: "0",
        sex: "0",
        sab: "0"
      },
      totalHoras: 0
    };
    setLinhas([...linhas, novaLinha]);
  };

  // Remover linha
  const removerLinha = (id: string) => {
    setLinhas(linhas.filter(linha => linha.id !== id));
  };

  // Buscar campanhas quando cliente é selecionado
  const buscarCampanhas = async (clienteId: string) => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}/campanhas`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Erro ao buscar campanhas');
      const campanhas = await response.json();
      setCampanhasPorCliente(prev => ({ ...prev, [clienteId]: campanhas }));
      return campanhas;
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      return [];
    }
  };

  // Buscar tarefas quando campanha é selecionada
  const buscarTarefas = async (campanhaId: string) => {
    try {
      const response = await fetch(`/api/campanhas/${campanhaId}/tarefas`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Erro ao buscar tarefas');
      const tarefas = await response.json();
      setTarefasPorCampanha(prev => ({ ...prev, [campanhaId]: tarefas }));
      return tarefas;
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      return [];
    }
  };

  // Atualizar dados da linha
  const atualizarLinha = async (id: string, campo: string, valor: string) => {
    const linhasAtualizadas = [...linhas];
    const indice = linhasAtualizadas.findIndex(linha => linha.id === id);
    
    if (indice === -1) return;

    const linha = linhasAtualizadas[indice];

    if (campo === 'clienteId') {
      const cliente = clientes.find(c => c.id.toString() === valor);
      linha.clienteId = valor;
      linha.clienteNome = cliente ? (cliente.tradeName || cliente.companyName) : "";
      linha.campanhaId = "";
      linha.campanhaNome = "";
      linha.tarefaId = "";
      linha.tarefaNome = "";
      
      if (valor) {
        await buscarCampanhas(valor);
      }
    } else if (campo === 'campanhaId') {
      const campanhas = campanhasPorCliente[linha.clienteId] || [];
      const campanha = campanhas.find(c => c.id.toString() === valor);
      linha.campanhaId = valor;
      linha.campanhaNome = campanha?.name || "";
      linha.tarefaId = "";
      linha.tarefaNome = "";
      
      if (valor) {
        await buscarTarefas(valor);
      }
    } else if (campo === 'tarefaId') {
      const tarefas = tarefasPorCampanha[linha.campanhaId] || [];
      const tarefa = tarefas.find(t => t.id.toString() === valor);
      linha.tarefaId = valor;
      linha.tarefaNome = tarefa?.description || "";
    } else if (campo.startsWith('horas.')) {
      const dia = campo.split('.')[1];
      linha.horas[dia] = valor;
      
      // Recalcular total da linha
      linha.totalHoras = Object.values(linha.horas).reduce((total, horas) => {
        return total + parseFloat(horas || "0");
      }, 0);
    }

    setLinhas(linhasAtualizadas);
  };

  // Calcular totais por dia
  const calcularTotalDia = (dia: string) => {
    return linhas.reduce((total, linha) => {
      return total + parseFloat(linha.horas[dia] || "0");
    }, 0);
  };

  // Calcular total geral
  const calcularTotalGeral = () => {
    return linhas.reduce((total, linha) => total + linha.totalHoras, 0);
  };

  // Formatação de data para exibição
  const formatarDataSemana = () => {
    const inicio = format(diasSemana[0], "dd/MM", { locale: ptBR });
    const fim = format(diasSemana[5], "dd/MM/yyyy", { locale: ptBR });
    return `${inicio} - ${fim}`;
  };

  // Mutation para salvar timesheet
  const salvarTimesheet = useMutation({
    mutationFn: async (status: 'RASCUNHO' | 'VALIDACAO') => {
      const entradas = [];
      
      for (const linha of linhas) {
        if (!linha.clienteId || !linha.campanhaId || !linha.tarefaId) continue;
        
        for (let i = 0; i < diasSemana.length; i++) {
          const dia = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'][i];
          const horas = linha.horas[dia];
          
          if (parseFloat(horas || "0") > 0) {
            entradas.push({
              clientId: parseInt(linha.clienteId),
              campaignId: parseInt(linha.campanhaId),
              campaignTaskId: parseInt(linha.tarefaId),
              date: format(diasSemana[i], "yyyy-MM-dd"),
              hours: horas,
              description: null,
              status
            });
          }
        }
      }

      for (const entrada of entradas) {
        await apiRequest("POST", "/api/timesheet/entrada-horas", entrada);
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Timesheet salvo com sucesso",
      });
      // Manter as linhas na tela para permitir edições
      refetchEntradas();
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar timesheet",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheet Semanal
          </CardTitle>
          
          <div className="flex items-center gap-4">
            {/* Navegação de semana */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navegarSemana('anterior')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-32 text-center">
                {formatarDataSemana()}
              </span>
              <Button variant="outline" size="sm" onClick={() => navegarSemana('proxima')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              <Button onClick={adicionarLinha} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Linha
              </Button>
              
              {linhas.length > 0 && (
                <>
                  <Button 
                    onClick={() => salvarTimesheet.mutate('RASCUNHO')} 
                    size="sm" 
                    variant="outline"
                    disabled={salvarTimesheet.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Rascunho
                  </Button>
                  
                  <Button 
                    onClick={() => salvarTimesheet.mutate('VALIDACAO')} 
                    size="sm"
                    disabled={salvarTimesheet.isPending}
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
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-3 text-left text-sm font-medium w-48">Cliente</th>
                <th className="border border-gray-300 p-3 text-left text-sm font-medium w-48">Campanha</th>
                <th className="border border-gray-300 p-3 text-left text-sm font-medium w-48">Tarefa</th>
                {diasSemana.map((dia, index) => (
                  <th key={index} className="border border-gray-300 p-3 text-center text-sm font-medium w-24">
                    <div>{format(dia, "EEE", { locale: ptBR })}</div>
                    <div className="text-xs text-gray-500">{format(dia, "dd/MM")}</div>
                  </th>
                ))}
                <th className="border border-gray-300 p-3 text-center text-sm font-medium w-20">Total</th>
                <th className="border border-gray-300 p-3 text-center text-sm font-medium w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id} className="hover:bg-gray-50">
                  {/* Cliente */}
                  <td className="border border-gray-300 p-2">
                    <Select 
                      value={linha.clienteId} 
                      onValueChange={(value) => atualizarLinha(linha.id, 'clienteId', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientesLoading ? (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        ) : clientes.length > 0 ? (
                          clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id.toString()}>
                              {cliente.tradeName || cliente.companyName}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhum cliente disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Campanha */}
                  <td className="border border-gray-300 p-2">
                    <Select 
                      value={linha.campanhaId} 
                      onValueChange={(value) => atualizarLinha(linha.id, 'campanhaId', value)}
                      disabled={!linha.clienteId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={linha.clienteId ? "Selecionar campanha" : "Primeiro selecione cliente"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(campanhasPorCliente[linha.clienteId] || []).length > 0 ? (
                          campanhasPorCliente[linha.clienteId].map((campanha) => (
                            <SelectItem key={campanha.id} value={campanha.id.toString()}>
                              {campanha.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhuma campanha disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Tarefa */}
                  <td className="border border-gray-300 p-2">
                    <Select 
                      value={linha.tarefaId} 
                      onValueChange={(value) => atualizarLinha(linha.id, 'tarefaId', value)}
                      disabled={!linha.campanhaId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={linha.campanhaId ? "Selecionar tarefa" : "Primeiro selecione campanha"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(tarefasPorCampanha[linha.campanhaId] || []).length > 0 ? (
                          tarefasPorCampanha[linha.campanhaId].map((tarefa) => (
                            <SelectItem key={tarefa.id} value={tarefa.id.toString()}>
                              {tarefa.description}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhuma tarefa disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Horas por dia */}
                  {['seg', 'ter', 'qua', 'qui', 'sex', 'sab'].map((dia) => (
                    <td key={dia} className="border border-gray-300 p-2">
                      <Select 
                        value={linha.horas[dia]} 
                        onValueChange={(value) => atualizarLinha(linha.id, `horas.${dia}`, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="0" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {opcoesDuracao.map((opcao) => (
                            <SelectItem key={opcao} value={opcao}>
                              {opcao}h
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  ))}

                  {/* Total da linha */}
                  <td className="border border-gray-300 p-2 text-center font-medium">
                    {linha.totalHoras.toFixed(2)}h
                  </td>

                  {/* Ações */}
                  <td className="border border-gray-300 p-2 text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removerLinha(linha.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

              {/* Linha de totais */}
              {linhas.length > 0 && (
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={3} className="border border-gray-300 p-3 text-right">
                    Total Geral:
                  </td>
                  {['seg', 'ter', 'qua', 'qui', 'sex', 'sab'].map((dia) => (
                    <td key={dia} className="border border-gray-300 p-3 text-center">
                      {calcularTotalDia(dia).toFixed(2)}h
                    </td>
                  ))}
                  <td className="border border-gray-300 p-3 text-center">
                    {calcularTotalGeral().toFixed(2)}h
                  </td>
                  <td className="border border-gray-300 p-3"></td>
                </tr>
              )}
            </tbody>
          </table>

          {linhas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhuma linha adicionada</p>
              <p className="text-sm">Clique em "Adicionar Linha" para começar a registrar suas horas</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}