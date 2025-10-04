import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Send, ChevronLeft, ChevronRight, Calendar, Edit, X, RefreshCw, MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getStatusConfig, needsReview } from "@/lib/statusUtils";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { CommentModal } from "./CommentModal";

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

interface EntradaSalva {
  id: number;
  date: string;
  hours: string;
  status: string;
  clienteNome: string;
  campanhaNome: string;
  tarefaNome: string;
  reviewComment?: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export function TimesheetSemanal() {
  const [semanaAtual, setSemanaAtual] = useState(new Date());
  const [linhas, setLinhas] = useState<LinhaTimesheet[]>([]);
  const [campanhasPorCliente, setCampanhasPorCliente] = useState<Record<string, Campanha[]>>({});
  const [tarefasPorCampanha, setTarefasPorCampanha] = useState<Record<string, Tarefa[]>>({});
  const [mostrarHistorico, setMostrarHistorico] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date());
  
  // Estados para modal de edição
  const [entradaEditando, setEntradaEditando] = useState<EntradaSalva | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [horasEditando, setHorasEditando] = useState("");
  
  // Estados para confirmação de exclusão
  const [entradaParaExcluir, setEntradaParaExcluir] = useState<EntradaSalva | null>(null);
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false);
  
  // Estados para modal de comentários
  const [entradaParaComentario, setEntradaParaComentario] = useState<any>(null);
  const [modalComentarioAberto, setModalComentarioAberto] = useState(false);
  
  // Estado para controlar quais entradas têm comentários
  const [entradasComComentarios, setEntradasComComentarios] = useState<Set<number>>(new Set());

  // Estados para filtros do histórico mensal
  const [filtroCliente, setFiltroCliente] = useState("all");
  const [filtroCampanha, setFiltroCampanha] = useState("all");
  const [filtroDia, setFiltroDia] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar dados do usuário atual
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user");
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
  });

  // Função para verificar se uma entrada tem comentários
  const verificarComentarios = async (entradaId: number) => {
    try {
      const response = await fetch(`/api/time-entries/${entradaId}/comments`, {
        credentials: "include"
      });
      if (response.ok) {
        const comentarios = await response.json();
        return comentarios.length > 0;
      }
    } catch (error) {
      console.error('Erro ao verificar comentários:', error);
    }
    return false;
  };



  // Calcular dias da semana (segunda a domingo)
  const inicioSemana = startOfWeek(semanaAtual, { weekStartsOn: 1 }); // Segunda-feira
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));

  // Buscar clientes
  const { data: clientes = [], isLoading: clientesLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
    queryFn: async () => {
      const response = await fetch("/api/clientes", { credentials: "include" });
      if (!response.ok) {
        console.error("Erro ao buscar clientes:", response.status);
        return [];
      }
      const data = await response.json();
      console.log("Clientes carregados:", data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  // Buscar todas as campanhas para o filtro
  const { data: campanhasParaFiltro = [] } = useQuery<Campanha[]>({
    queryKey: ["/api/campanhas", "filtro"],
    queryFn: async () => {
      const response = await fetch("/api/campanhas", { credentials: "include" });
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  // Buscar entradas existentes da semana
  const { data: entradasExistentes = [], refetch: refetchEntradas } = useQuery({
    queryKey: ["/api/timesheet/semana", format(inicioSemana, "yyyy-MM-dd"), format(addDays(inicioSemana, 6), "yyyy-MM-dd")],
    queryFn: async () => {
      try {
        const url = `/api/timesheet/semana?inicioSemana=${format(inicioSemana, "yyyy-MM-dd")}&fimSemana=${format(addDays(inicioSemana, 6), "yyyy-MM-dd")}`;
        const response = await fetch(url, { credentials: "include" });
        
        if (!response.ok) {
          return [];
        }
        
        return await response.json();
      } catch (error) {
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // Buscar histórico mensal de entradas - sempre ativo (apenas do usuário logado)
  const { data: historicoMensal = [], refetch: refetchHistorico } = useQuery<EntradaSalva[]>({
    queryKey: ["/api/time-entries/mensal", format(mesAtual, "yyyy-MM")],
    queryFn: async () => {
      const inicioMes = format(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1), "yyyy-MM-dd");
      const fimMes = format(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0), "yyyy-MM-dd");
      
      const response = await fetch(`/api/time-entries/user?fromDate=${inicioMes}&toDate=${fimMes}`, { credentials: "include" });
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.map((entrada: any): EntradaSalva => ({
        id: entrada.id,
        date: entrada.date,
        hours: entrada.hours,
        status: entrada.status,
        clienteNome: entrada.campaign?.client?.tradeName || entrada.campaign?.client?.companyName || 'Cliente não informado',
        campanhaNome: entrada.campaign?.name || 'Campanha não informada',
        tarefaNome: entrada.campaignTask?.description || 'Tarefa não informada',
        reviewComment: entrada.reviewComment,
        submittedAt: entrada.submittedAt,
        reviewedAt: entrada.reviewedAt
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  // Efeito para verificar comentários das entradas do histórico
  useEffect(() => {
    const verificarComentariosDoHistorico = async () => {
      if (!historicoMensal || historicoMensal.length === 0) return;
      
      const novasEntradasComComentarios = new Set<number>();
      
      for (const entrada of historicoMensal) {
        const temComentarios = await verificarComentarios(entrada.id);
        if (temComentarios) {
          novasEntradasComComentarios.add(entrada.id);
        }
      }
      
      setEntradasComComentarios(novasEntradasComComentarios);
    };

    verificarComentariosDoHistorico();
  }, [historicoMensal]);

  // Processar entradas existentes usando useMemo para evitar loops
  const linhasProcessadas = useMemo(() => {
    if (!entradasExistentes || !Array.isArray(entradasExistentes) || entradasExistentes.length === 0) {
      return [];
    }

    const linhasAgrupadas: Record<string, LinhaTimesheet> = {};

    for (const entrada of entradasExistentes) {
      if (!entrada || !entrada.campaignTaskId || !entrada.clientId || !entrada.campaignId) continue;

      const chave = `${entrada.campaignTaskId}-${entrada.clientId}-${entrada.campaignId}`;

      if (!linhasAgrupadas[chave]) {
        const clienteNome =
          entrada.campaign?.client?.tradeName ||
          entrada.campaign?.client?.companyName ||
          `Cliente ${entrada.clientId}`;
        const campanhaNome = entrada.campaign?.name || `Campanha ${entrada.campaignId}`;
        const tarefaNome = entrada.campaignTask?.description || `Tarefa ${entrada.campaignTaskId}`;

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
            sab: "0",
            dom: "0",
          },
          totalHoras: 0,
        };
      }

      const dataEntrada = new Date(entrada.date);
      const diaSemana = dataEntrada.getDay();
      const mapaDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const diaKey = mapaDias[diaSemana];

      if (diaKey) {
        linhasAgrupadas[chave].horas[diaKey] = entrada.hours.toString();
      }
    }

    Object.values(linhasAgrupadas).forEach((linha) => {
      linha.totalHoras = Object.values(linha.horas).reduce((total, horas) => {
        return total + parseFloat(horas || "0");
      }, 0);
    });

    return Object.values(linhasAgrupadas);
  }, [entradasExistentes, format(inicioSemana, "yyyy-MM-dd")]);

  // Sincronizar linhas processadas com o estado apenas quando necessário
  useEffect(() => {
    // Preservar linhas manuais e atualizar apenas as linhas existentes
    const linhasManuais = linhas.filter(linha => linha.id.startsWith('linha-'));
    const linhasExistentesAtuais = linhas.filter(linha => !linha.id.startsWith('linha-'));
    
    // Só atualizar se as linhas existentes mudaram
    if (JSON.stringify(linhasProcessadas) !== JSON.stringify(linhasExistentesAtuais)) {
      setLinhas([...linhasProcessadas, ...linhasManuais]);
    }
  }, [linhasProcessadas, inicioSemana]);

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
        sab: "0",
        dom: "0"
      },
      totalHoras: 0
    };
    
    setLinhas(linhasAtuais => [...linhasAtuais, novaLinha]);
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
    const fim = format(diasSemana[6], "dd/MM/yyyy", { locale: ptBR });
    return `${inicio} - ${fim}`;
  };

  // Mutation para salvar timesheet
  const salvarTimesheet = useMutation({
    mutationFn: async (status: 'RASCUNHO' | 'VALIDACAO') => {
      const entradas = [];
      
      for (const linha of linhas) {
        if (!linha.clienteId || !linha.campanhaId || !linha.tarefaId) continue;
        
        for (let i = 0; i < diasSemana.length; i++) {
          const dia = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'][i];
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
    onSuccess: (data, variables) => {
      const isRascunho = variables === 'RASCUNHO';
      
      toast({
        title: "Sucesso!",
        description: isRascunho 
          ? "Timesheet salvo como rascunho." 
          : "Timesheet enviado para validação",
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

  // Funções para comentários
  const abrirModalComentario = (entrada: any) => {
    setEntradaParaComentario(entrada);
    setModalComentarioAberto(true);
  };

  const fecharModalComentario = () => {
    setEntradaParaComentario(null);
    setModalComentarioAberto(false);
  };

  // Funções para editar entrada
  const abrirModalEdicao = (entrada: EntradaSalva) => {
    setEntradaEditando(entrada);
    setHorasEditando(entrada.hours);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setEntradaEditando(null);
    setHorasEditando("");
    setModalAberto(false);
  };

  // Abrir modal de confirmação de exclusão
  const abrirModalExclusao = (entrada: EntradaSalva) => {
    setEntradaParaExcluir(entrada);
    setModalExclusaoAberto(true);
  };

  // Confirmar exclusão
  const confirmarExclusao = () => {
    if (entradaParaExcluir) {
      excluirEntrada.mutate(entradaParaExcluir.id, {
        onSuccess: () => {
          setModalExclusaoAberto(false);
          setEntradaParaExcluir(null);
          // Forçar atualização imediata do histórico
          refetchHistorico();
        }
      });
    }
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
      
      fecharModal();
      
      // Forçar atualização imediata de todas as queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/mensal"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/timesheet/semana"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/reports/user-stats"] }),
        refetchHistorico(),
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
      
      // Forçar atualização imediata de todas as queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/mensal"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/timesheet/semana"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/reports/user-stats"] }),
        queryClient.refetchQueries({ queryKey: ["/api/time-entries"] }),
        queryClient.refetchQueries({ queryKey: ["/api/time-entries/mensal"] }),
        queryClient.refetchQueries({ queryKey: ["/api/timesheet/semana"] }),
        queryClient.refetchQueries({ queryKey: ["/api/reports/user-stats"] }),
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

  // Mutation para enviar entrada individual para validação
  const enviarParaValidacao = useMutation({
    mutationFn: async (entradaId: number) => {
      await apiRequest("PATCH", `/api/time-entries/${entradaId}`, {
        status: "VALIDACAO"
      });
    },
    onSuccess: async () => {
      toast({
        title: "Sucesso!",
        description: "Entrada enviada para validação",
      });
      
      // Atualizar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/mensal"] }),
        refetchHistorico()
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar para validação",
        variant: "destructive",
      });
    },
  });

  // Mutation para envio em lote para validação
  const enviarLoteParaValidacao = useMutation({
    mutationFn: async () => {
      const entradasParaValidacao = historicoMensal.filter(entrada => 
        entrada.status === 'RASCUNHO' || entrada.status === 'SALVO'
      );
      
      if (entradasParaValidacao.length === 0) {
        throw new Error("Nenhuma entrada em rascunho ou salva encontrada");
      }
      
      // Enviar todas as entradas em rascunho ou salvas para validação
      await Promise.all(
        entradasParaValidacao.map(entrada => 
          apiRequest("PATCH", `/api/time-entries/${entrada.id}`, {
            status: "VALIDACAO"
          })
        )
      );
      
      return entradasParaValidacao.length;
    },
    onSuccess: async (quantidade) => {
      toast({
        title: "Sucesso!",
        description: `${quantidade} entrada(s) enviada(s) para validação`,
      });
      
      // Atualizar queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/mensal"] }),
        refetchHistorico()
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar entradas para validação",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
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
                    Enviar para Validação
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
                          <SelectItem value="loading-clients" disabled>Carregando...</SelectItem>
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
                          <SelectItem value="no-campaigns" disabled>Nenhuma campanha disponível</SelectItem>
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
                          <SelectItem value="no-tasks" disabled>Nenhuma tarefa disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Horas por dia */}
                  {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => (
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
                  {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => (
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

    {/* Histórico Mensal */}
    {mostrarHistorico && (
      <Card className="w-full mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico Mensal - {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {historicoMensal.filter(entrada => entrada.status === 'RASCUNHO' || entrada.status === 'SALVO').length > 0 && (
                <Button 
                  size="sm" 
                  onClick={() => enviarLoteParaValidacao.mutate()}
                  disabled={enviarLoteParaValidacao.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="w-4 h-4 mr-1" />
                  {enviarLoteParaValidacao.isPending ? "Enviando..." : "Enviar para Validação"}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchHistorico()}
                title="Atualizar histórico"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMostrarHistorico(false)}
              >
                Ocultar
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select value={filtroCliente} onValueChange={(value) => {
                setFiltroCliente(value);
                // Reset campaign filter when client changes
                if (value === "all") {
                  setFiltroCampanha("all");
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.tradeName || cliente.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Campanha</label>
              <Select value={filtroCampanha} onValueChange={setFiltroCampanha}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {campanhasParaFiltro
                    .filter((campanha) => 
                      filtroCliente === "all" || campanha.clientId?.toString() === filtroCliente
                    )
                    .map((campanha) => (
                      <SelectItem key={campanha.id} value={campanha.id.toString()}>
                        {campanha.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Dia</label>
              <Select value={filtroDia} onValueChange={setFiltroDia}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os dias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dias</SelectItem>
                  {Array.from(new Set(historicoMensal.map((entrada: any) => entrada.date)))
                    .sort()
                    .map((date: string) => (
                      <SelectItem key={date} value={date}>
                        {format(new Date(date + 'T00:00:00'), "dd/MM/yyyy")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                  <SelectItem value="SALVO">Salvo</SelectItem>
                  <SelectItem value="VALIDACAO">Em Validação</SelectItem>
                  <SelectItem value="APROVADO">Aprovado</SelectItem>
                  <SelectItem value="REJEITADO">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFiltroCliente("all");
                  setFiltroCampanha("all");
                  setFiltroDia("all");
                  setFiltroStatus("all");
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {historicoMensal.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma entrada encontrada para este mês</p>
              </div>
            ) : (
              <>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                          <th className="border-b border-gray-300 p-3 text-left">Data</th>
                          <th className="border-b border-gray-300 p-3 text-left">Cliente</th>
                          <th className="border-b border-gray-300 p-3 text-left">Campanha</th>
                          <th className="border-b border-gray-300 p-3 text-left">Tarefa</th>
                          <th className="border-b border-gray-300 p-3 text-center">Horas</th>
                          <th className="border-b border-gray-300 p-3 text-center">Status</th>
                          <th className="border-b border-gray-300 p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoMensal
                          .filter((entrada: any) => {
                            const clienteSelecionado = clientes.find(c => c.id.toString() === filtroCliente);
                            const matchesClient = filtroCliente === "all" || 
                              entrada.clienteNome?.toLowerCase() === clienteSelecionado?.companyName?.toLowerCase() ||
                              entrada.clienteNome?.toLowerCase() === clienteSelecionado?.tradeName?.toLowerCase();
                            
                            const campanhaSelecionada = campanhasParaFiltro.find(c => c.id.toString() === filtroCampanha);
                            const matchesCampaign = filtroCampanha === "all" || 
                              entrada.campanhaNome?.toLowerCase() === campanhaSelecionada?.name?.toLowerCase();
                            
                            const matchesDay = filtroDia === "all" || entrada.date === filtroDia;
                            const matchesStatus = filtroStatus === "all" || entrada.status === filtroStatus;
                            
                            return matchesClient && matchesCampaign && matchesDay && matchesStatus;
                          })
                          .sort((a: EntradaSalva, b: EntradaSalva) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime())
                          .map((entrada: EntradaSalva) => (
                          <tr key={entrada.id} className="hover:bg-gray-50 border-b border-gray-200">
                            <td className="p-3">
                              {format(new Date(entrada.date + 'T00:00:00'), "dd/MM/yyyy")}
                            </td>
                            <td className="p-3">
                              {entrada.clienteNome}
                            </td>
                            <td className="p-3">
                              {entrada.campanhaNome}
                            </td>
                            <td className="p-3">
                              {entrada.tarefaNome}
                            </td>
                            <td className="p-3 text-center">
                              {entrada.hours}h
                            </td>
                            <td className="p-3 text-center">
                              <StatusBadge status={entrada.status} needsReview={needsReview(entrada)} entryId={entrada.id} />
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {entrada.status !== 'APROVADO' && (
                                  <>
                                    {(entrada.status === 'RASCUNHO' || entrada.status === 'SALVO' || entrada.status === 'REJEITADO') && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => abrirModalEdicao(entrada)}
                                          className="h-8 w-8 p-0"
                                          title="Editar"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        {(entrada.status === 'RASCUNHO' || entrada.status === 'SALVO') && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => enviarParaValidacao.mutate(entrada.id)}
                                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                            title="Enviar para validação"
                                            disabled={enviarParaValidacao.isPending}
                                          >
                                            <Send className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => abrirModalComentario(entrada)}
                                      className={`h-8 w-8 p-0 hover:bg-blue-50 ${
                                        entradasComComentarios.has(entrada.id) || entrada.reviewComment
                                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                                          : "text-blue-600"
                                      }`}
                                      title={entrada.reviewComment ? "Ver mensagem do gestor" : entradasComComentarios.has(entrada.id) ? "Comentários (tem comentários)" : "Comentários"}
                                      data-testid={`button-comentarios-${entrada.id}`}
                                    >
                                      <MessageCircle className={`h-4 w-4 ${entradasComComentarios.has(entrada.id) || entrada.reviewComment ? "fill-current" : ""}`} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => abrirModalExclusao(entrada)}
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                      title="Excluir"
                                      disabled={excluirEntrada.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {entrada.status === 'APROVADO' && (
                                  <span className="text-xs text-gray-500">Validado</span>
                                )}
                                {entrada.status === 'VALIDACAO' && (
                                  <span className="text-xs text-blue-600">Em validação</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                  
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total de horas {filtroCliente !== "all" || filtroCampanha !== "all" || filtroDia !== "all" || filtroStatus !== "all" ? "(filtradas)" : "no mês"}:</span>
                    <span className="text-lg font-bold">
                      {historicoMensal
                        .filter((entrada: any) => {
                          const clienteSelecionado = clientes.find(c => c.id.toString() === filtroCliente);
                          const matchesClient = filtroCliente === "all" || 
                            entrada.clienteNome?.toLowerCase() === clienteSelecionado?.companyName?.toLowerCase() ||
                            entrada.clienteNome?.toLowerCase() === clienteSelecionado?.tradeName?.toLowerCase();
                          
                          const campanhaSelecionada = campanhasParaFiltro.find(c => c.id.toString() === filtroCampanha);
                          const matchesCampaign = filtroCampanha === "all" || 
                            entrada.campanhaNome?.toLowerCase() === campanhaSelecionada?.name?.toLowerCase();
                          
                          const matchesDay = filtroDia === "all" || entrada.date === filtroDia;
                          const matchesStatus = filtroStatus === "all" || entrada.status === filtroStatus;
                          
                          return matchesClient && matchesCampaign && matchesDay && matchesStatus;
                        })
                        .reduce((total: number, entrada: EntradaSalva) => total + parseFloat(entrada.hours), 0).toFixed(2)}h
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )}

    {/* Modal de Edição */}
    <Dialog open={modalAberto} onOpenChange={setModalAberto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Entrada</DialogTitle>
        </DialogHeader>
        
        {entradaEditando && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Data:</Label>
                <p>{format(new Date(entradaEditando.date + 'T00:00:00'), "dd/MM/yyyy")}</p>
              </div>
              <div>
                <Label className="font-medium">Cliente:</Label>
                <p>{entradaEditando.clienteNome}</p>
              </div>
              <div>
                <Label className="font-medium">Campanha:</Label>
                <p>{entradaEditando.campanhaNome}</p>
              </div>
              <div>
                <Label className="font-medium">Tarefa:</Label>
                <p>{entradaEditando.tarefaNome}</p>
              </div>
            </div>

            {/* Mensagem do Gestor */}
            {entradaEditando.reviewComment && (
              <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
                <div className="flex items-start gap-2">
                  <MessageCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-800 mb-1">Mensagem do Gestor:</p>
                    <p className="text-sm text-orange-700">{entradaEditando.reviewComment}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="horas">Horas</Label>
              <Select value={horasEditando} onValueChange={setHorasEditando}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione as horas" />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDuracao.map((duracao) => (
                    <SelectItem key={duracao} value={duracao}>
                      {duracao}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button 
                onClick={() => editarEntrada.mutate()}
                disabled={editarEntrada.isPending}
              >
                {editarEntrada.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Modal de Confirmação de Exclusão */}
    <Dialog open={modalExclusaoAberto} onOpenChange={setModalExclusaoAberto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
        </DialogHeader>
        
        {entradaParaExcluir && (
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir esta entrada de timesheet?</p>
            
            <div className="bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Data:</span>
                  <p>{format(new Date(entradaParaExcluir.date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <span className="font-medium">Horas:</span>
                  <p>{entradaParaExcluir.hours}h</p>
                </div>
                <div>
                  <span className="font-medium">Cliente:</span>
                  <p>{entradaParaExcluir.clienteNome}</p>
                </div>
                <div>
                  <span className="font-medium">Campanha:</span>
                  <p>{entradaParaExcluir.campanhaNome}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Tarefa:</span>
                  <p>{entradaParaExcluir.tarefaNome}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setModalExclusaoAberto(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmarExclusao}
                disabled={excluirEntrada.isPending}
              >
                {excluirEntrada.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Modal de Comentários */}
    {entradaParaComentario && currentUser && (
      <CommentModal
        isOpen={modalComentarioAberto}
        onClose={fecharModalComentario}
        timeEntry={{
          ...entradaParaComentario,
          user: {
            name: `${currentUser.firstName} ${currentUser.lastName}`,
            role: currentUser.role
          }
        }}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
      />
    )}
  </div>
  );
}