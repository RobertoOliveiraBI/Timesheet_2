import { Layout } from "@/components/Layout";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  HelpCircle, 
  LogIn, 
  Clock, 
  BarChart3, 
  CheckCircle,
  BookOpen,
  MessageCircle
} from "lucide-react";

export default function SupportPage() {
  return (
    <Layout>
      <Header 
        title="Central de Suporte" 
        subtitle="Manual do usuário e ajuda do sistema" 
      />
      
      <div className="max-w-5xl mx-auto space-y-6 mt-6">
        <Card data-testid="card-support-intro">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              <CardTitle>Manual do Usuário – Tractionfy Timesheet</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Sistema de Gestão de Horas - Guia completo para utilização da plataforma
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-access-system">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">1. Acesso ao Sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700">
              O Tractionfy Timesheet é um sistema online (SaaS), acessado diretamente pelo navegador, 
              sem necessidade de instalação.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="font-medium text-slate-900">Informe suas credenciais:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li><strong>Usuário:</strong> [email do colaborador]</li>
                <li><strong>Senha:</strong> [senha inicial enviada por e-mail]</li>
              </ul>
            </div>

            <p className="text-sm text-slate-600 italic">
              Em caso de esquecimento de senha, entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-home-screen">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">2. Tela Inicial</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700">
              Após o login, o sistema exibirá um painel inicial com atalhos principais:
            </p>
            
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Lançar Horas:</strong>
                  <span className="text-slate-700"> onde são registradas as horas trabalhadas.</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Relatórios:</strong>
                  <span className="text-slate-700"> onde é possível visualizar o total de horas, status e produtividade.</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Meu Perfil:</strong>
                  <span className="text-slate-700"> para atualizar informações pessoais.</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Sair:</strong>
                  <span className="text-slate-700"> encerra a sessão.</span>
                </div>
              </li>
            </ul>

            <p className="text-sm text-slate-600 italic">
              No canto inferior direito, há um botão de Ajuda, que dá acesso ao chat de suporte.
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-log-hours">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">3. Lançar Horas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700">
              No menu lateral esquerdo, clique em <strong>Lançar Horas</strong>. 
              Esta tela possui duas seções principais:
            </p>

            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-slate-900 mb-2">a) Timesheet Semanal</h4>
                <p className="text-slate-700 mb-3">
                  Aqui o colaborador registra as horas do período.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-slate-700">
                  <li>Selecione o <strong>Cliente</strong></li>
                  <li>Escolha a <strong>Campanha</strong> ou projeto</li>
                  <li>Indique a <strong>Tarefa</strong> executada (ex: briefing, conteúdo, reunião)</li>
                  <li>Lance o número de horas trabalhadas em cada dia da semana</li>
                  <li>Clique em <strong>Salvar Rascunho</strong> para manter as informações sem enviar</li>
                  <li>Quando todas as horas da semana estiverem lançadas, clique em <strong>Enviar para Validação</strong></li>
                </ol>
                <p className="text-sm text-slate-600 mt-2 italic">
                  O status das horas mudará para "Em validação", aguardando aprovação do gestor.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-slate-900 mb-2">b) Histórico Mensal</h4>
                <ul className="space-y-2 text-slate-700">
                  <li>• Exibe todas as horas lançadas no mês</li>
                  <li>• Você pode filtrar por cliente, campanha, dia ou status (rascunho, em validação, aprovado)</li>
                  <li>• Também é possível editar ou excluir um lançamento clicando nos ícones de ação à direita</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-reports">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">4. Relatórios</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700">
              No menu lateral, selecione <strong>Relatórios</strong>. 
              Esta área permite acompanhar seu desempenho e produtividade.
            </p>

            <ul className="space-y-2 text-slate-700">
              <li>• Use os filtros superiores para selecionar período, cliente ou campanha</li>
              <li>• Veja os indicadores principais:
                <ul className="ml-6 mt-1 space-y-1">
                  <li>- Horas totais</li>
                  <li>- Horas faturáveis</li>
                  <li>- Horas não faturáveis</li>
                  <li>- Clientes atendidos</li>
                </ul>
              </li>
              <li>• Role a página para visualizar o <strong>Relatório Detalhado</strong>, com todas as horas lançadas e seus respectivos status</li>
              <li>• Você pode exportar os dados clicando em <strong>Baixar CSV</strong></li>
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="card-status">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">5. Status das Horas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 mb-3">
              Cada lançamento pode assumir um dos seguintes status:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-400 mt-1"></div>
                <div>
                  <strong className="text-slate-900">Rascunho:</strong>
                  <span className="text-slate-700"> horas ainda não enviadas para validação.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-400 mt-1"></div>
                <div>
                  <strong className="text-slate-900">Em Validação:</strong>
                  <span className="text-slate-700"> aguardando aprovação do gestor.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1"></div>
                <div>
                  <strong className="text-slate-900">Aprovado:</strong>
                  <span className="text-slate-700"> horas confirmadas e contabilizadas.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                <div>
                  <strong className="text-slate-900">Reprovado (se aplicável):</strong>
                  <span className="text-slate-700"> o gestor pode devolver o lançamento com observações.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-best-practices">
          <CardHeader>
            <CardTitle className="text-xl">6. Boas Práticas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Lançar as horas <strong>diariamente</strong> evita esquecimentos e mantém os relatórios precisos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Sempre categorize corretamente <strong>cliente, campanha e tarefa</strong> para facilitar as análises de custo e produtividade</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Revise suas entradas antes de enviar para validação</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Utilize o chat de suporte para qualquer dúvida ou dificuldade técnica</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="card-help" className="bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">7. Suporte e Manual</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 mb-3">
              Caso precise de ajuda:
            </p>
            
            <div className="bg-white p-4 rounded-lg border border-primary/20">
              <p className="text-slate-700">
                Acesse o chat clicando no ícone <strong>"Ajuda"</strong> no canto inferior direito do sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
