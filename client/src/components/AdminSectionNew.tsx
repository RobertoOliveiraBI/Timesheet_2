import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Settings, 
  UserPlus, 
  Building, 
  Target, 
  Clock, 
  ShieldCheck,
  Edit,
  Download,
  BarChart3,
  Plus,
  Trash2,
  UserCog,
  Building2,
  Briefcase,
  Tags,
  Search,
  Copy
} from "lucide-react";
import { UserModal, EconomicGroupModal, ClientModal, CampaignModal, TaskTypeModal, CampaignTaskModal, DepartmentModal, CostCenterModal } from "./AdminModals";
import { CampaignAccessModal } from "./CampaignAccessModal";

export function AdminSection() {
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [campaignAccessModal, setCampaignAccessModal] = useState<{ isOpen: boolean; campaign: any }>({ isOpen: false, campaign: null });
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [deleteEntriesModal, setDeleteEntriesModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingEntries, setIsDeletingEntries] = useState(false);
  const [searchTerms, setSearchTerms] = useState({
    users: "",
    groups: "",
    clients: "",
    campaigns: "",
    taskTypes: "",
    campaignTasks: "",
    departments: "",
    costCenters: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], error: usersError, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/usuarios"],
    queryFn: async () => {
      const response = await fetch("/api/usuarios", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });



  const { data: economicGroups = [], error: groupsError, isLoading: groupsLoading } = useQuery<any[]>({
    queryKey: ["/api/grupos"],
    queryFn: async () => {
      const response = await fetch("/api/grupos", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: clients = [], error: clientsError, isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clientes"],
    queryFn: async () => {
      const response = await fetch("/api/clientes", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: campaigns = [], error: campaignsError, isLoading: campaignsLoading } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const response = await fetch("/api/campaigns", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: taskTypes = [], error: taskTypesError, isLoading: taskTypesLoading } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
    queryFn: async () => {
      const response = await fetch("/api/task-types", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });



  const { data: campaignTasks = [], isLoading: campaignTasksLoading } = useQuery<any[]>({
    queryKey: ["/api/campaign-tasks"],
    queryFn: async () => {
      const response = await fetch("/api/campaign-tasks", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: departments = [], error: departmentsError, isLoading: departmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: costCenters = [], error: costCentersError, isLoading: costCentersLoading } = useQuery<any[]>({
    queryKey: ["/api/cost-centers"],
    queryFn: async () => {
      const response = await fetch("/api/cost-centers", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });



  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      const endpoints = {
        user: `/api/usuarios/${id}`,
        group: `/api/grupos/${id}`,
        client: `/api/clientes/${id}`,
        campaign: `/api/campanhas/${id}`,
        taskType: `/api/tipos-tarefa/${id}`,
        campaignTask: `/api/campaign-tasks/${id}`,
        department: `/api/departments/${id}`,
        costCenter: `/api/cost-centers/${id}`,
      };
      await apiRequest("DELETE", endpoints[type as keyof typeof endpoints]);
    },
    onSuccess: (_, variables) => {
      const queries = {
        user: ["/api/usuarios"],
        group: ["/api/grupos"],
        client: ["/api/clientes"],
        campaign: ["/api/campaigns"],
        taskType: ["/api/task-types"],
        department: ["/api/departments"],
        costCenter: ["/api/cost-centers"],
      };
      queryClient.invalidateQueries({ queryKey: queries[variables.type as keyof typeof queries] });
      toast({ title: "Item removido com sucesso!" });
    },
    onError: () => {
      toast({
        title: "Erro ao remover item",
        variant: "destructive",
      });
    },
  });

  const openModal = (modalType: string, item?: any) => {
    setSelectedModal(modalType);
    setSelectedItem(item);
  };

  const closeModal = () => {
    setSelectedModal(null);
    setSelectedItem(null);
  };

  // ✨ FUNÇÃO DE BACKUP MANUAL
  const handleManualBackup = async () => {
    setIsBackupLoading(true);
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Erro ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: "✅ Backup concluído!",
        description: `${result.count} arquivos CSV gerados - ${result.timestamp}`,
        duration: 5000,
      });
      
    } catch (error) {
      console.error('Erro no backup:', error);
      toast({
        variant: "destructive",
        title: "❌ Erro no backup",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        duration: 7000,
      });
    } finally {
      setIsBackupLoading(false);
    }
  };

  // 🗑️ FUNÇÃO PARA DELETAR ENTRADAS DE TESTE
  const handleDeleteTestEntries = async () => {
    if (deletePassword !== "123mudar") {
      toast({
        variant: "destructive",
        title: "Senha incorreta",
        description: "Digite a senha correta para confirmar a exclusão",
      });
      return;
    }

    setIsDeletingEntries(true);
    try {
      const response = await fetch('/api/admin/delete-test-entries', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Erro ${response.status}`);
      }

      const result = await response.json();
      
      const message = result.deletedCommentsCount > 0 
        ? `${result.deletedCount} entradas e ${result.deletedCommentsCount} comentários removidos`
        : `${result.deletedCount} entradas de teste foram removidas`;
      
      toast({
        title: "✅ Entradas removidas!",
        description: message,
        duration: 5000,
      });

      // Fechar modal e limpar estado
      setDeleteEntriesModal(false);
      setDeletePassword("");
      
      // Invalidar queries para atualizar as listas
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/user"] });
      
    } catch (error) {
      console.error('Erro ao deletar entradas:', error);
      toast({
        variant: "destructive",
        title: "❌ Erro ao deletar entradas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        duration: 7000,
      });
    } finally {
      setIsDeletingEntries(false);
    }
  };

  // Funções de filtro para busca
  const filteredUsers = users.filter(user => 
    user.firstName?.toLowerCase().includes(searchTerms.users.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerms.users.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerms.users.toLowerCase()) ||
    user.position?.toLowerCase().includes(searchTerms.users.toLowerCase())
  );

  const filteredGroups = economicGroups.filter(group =>
    group.name?.toLowerCase().includes(searchTerms.groups.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerms.groups.toLowerCase())
  );

  const filteredClients = clients.filter(client =>
    client.companyName?.toLowerCase().includes(searchTerms.clients.toLowerCase()) ||
    client.tradeName?.toLowerCase().includes(searchTerms.clients.toLowerCase()) ||
    client.cnpj?.toLowerCase().includes(searchTerms.clients.toLowerCase())
  );

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name?.toLowerCase().includes(searchTerms.campaigns.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchTerms.campaigns.toLowerCase())
  );

  const filteredTaskTypes = taskTypes.filter(taskType =>
    taskType.name?.toLowerCase().includes(searchTerms.taskTypes.toLowerCase()) ||
    taskType.description?.toLowerCase().includes(searchTerms.taskTypes.toLowerCase())
  );

  const filteredCampaignTasks = campaignTasks.filter(task =>
    task.description?.toLowerCase().includes(searchTerms.campaignTasks.toLowerCase()) ||
    task.campaign?.name?.toLowerCase().includes(searchTerms.campaignTasks.toLowerCase()) ||
    task.taskType?.name?.toLowerCase().includes(searchTerms.campaignTasks.toLowerCase())
  );

  const filteredDepartments = departments.filter(department =>
    department.name?.toLowerCase().includes(searchTerms.departments.toLowerCase()) ||
    department.description?.toLowerCase().includes(searchTerms.departments.toLowerCase())
  );

  const filteredCostCenters = costCenters.filter(costCenter =>
    costCenter.name?.toLowerCase().includes(searchTerms.costCenters.toLowerCase()) ||
    costCenter.code?.toLowerCase().includes(searchTerms.costCenters.toLowerCase()) ||
    costCenter.description?.toLowerCase().includes(searchTerms.costCenters.toLowerCase())
  );



  const quickActions = [
    {
      title: "Novo Usuário",
      description: "Cadastrar novo colaborador",
      icon: UserPlus,
      color: "bg-blue-500",
      action: () => openModal("user"),
    },
    {
      title: "Grupo Econômico",
      description: "Criar grupo de empresas",
      icon: Building2,
      color: "bg-green-500",
      action: () => openModal("economicGroup"),
    },
    {
      title: "Novo Cliente",
      description: "Adicionar cliente",
      icon: Building,
      color: "bg-purple-500",
      action: () => openModal("client"),
    },
    {
      title: "Nova Campanha",
      description: "Criar campanha/projeto",
      icon: Target,
      color: "bg-orange-500",
      action: () => openModal("campaign"),
    },
    {
      title: "Backup CSV",
      description: "Gerar backup de todas as tabelas",
      icon: Download,
      color: "bg-indigo-600",
      action: handleManualBackup,
      loading: isBackupLoading,
    },
    {
      title: "Limpar Entradas",
      description: "Apagar entradas",
      icon: Trash2,
      color: "bg-red-600",
      action: () => setDeleteEntriesModal(true),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={action.action}
                disabled={action.loading}
                data-testid={`button-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center text-white`}>
                  {action.loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                  ) : (
                    <action.icon className="w-6 h-6" />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">
                    {action.loading ? 'Processando...' : action.title}
                  </p>
                  <p className="text-xs text-slate-500">{action.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Usuários ({filteredUsers.length} de {users.length})
            </CardTitle>
            <Button onClick={() => openModal("user")}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar usuários por nome, email ou cargo..."
              value={searchTerms.users}
              onChange={(e) => setSearchTerms({...searchTerms, users: e.target.value})}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Papel</th>
                  <th className="text-left p-3">Departamento</th>
                  <th className="text-left p-3">Gestor</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      Carregando usuários...
                    </td>
                  </tr>
                ) : usersError ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-red-500">
                      Erro ao carregar usuários: {usersError.message || 'Erro desconhecido'}
                    </td>
                  </tr>
                ) : filteredUsers && filteredUsers.length > 0 ? filteredUsers.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-slate-500">{user.position}</p>
                      </div>
                    </td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <Badge variant={user.role === 'MASTER' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-3">{user.department?.name || '-'}</td>
                    <td className="p-3">
                      {user.managerId ? (
                        <span className="text-sm text-slate-600">
                          {users.find((m: any) => m.id === user.managerId)?.firstName} {users.find((m: any) => m.id === user.managerId)?.lastName}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={user.isActive ? 'default' : 'destructive'}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal("user", user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate({ type: "user", id: user.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      Nenhum usuário cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Economic Groups */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Grupos Econômicos ({filteredGroups.length} de {economicGroups.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("economicGroup")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar grupos por nome..."
                value={searchTerms.groups}
                onChange={(e) => setSearchTerms({...searchTerms, groups: e.target.value})}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {groupsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : groupsError ? (
              <div className="text-center py-4 text-red-600">
                Erro ao carregar grupos: {groupsError.message}
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.isArray(filteredGroups) && filteredGroups.length > 0 ? filteredGroups.map((group: any) => (
                  <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-slate-500">{group.description}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal("economicGroup", group)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ type: "group", id: group.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-500">
                    {searchTerms.groups ? 'Nenhum grupo encontrado para esta busca' : 'Nenhum grupo econômico cadastrado'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Clientes ({filteredClients.length} de {clients.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("client")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar clientes por nome ou CNPJ..."
                value={searchTerms.clients}
                onChange={(e) => setSearchTerms({...searchTerms, clients: e.target.value})}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : clientsError ? (
              <div className="text-center py-4 text-red-600">
                Erro ao carregar clientes: {clientsError.message}
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.isArray(filteredClients) && filteredClients.length > 0 ? filteredClients.map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{client.companyName}</p>
                      <p className="text-sm text-slate-500">{client.tradeName}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal("client", client)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ type: "client", id: client.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-500">
                    {searchTerms.clients ? 'Nenhum cliente encontrado para esta busca' : 'Nenhum cliente cadastrado'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Campanhas</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("campaign")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : campaignsError ? (
              <div className="text-center py-4 text-red-600">
                Erro ao carregar campanhas: {campaignsError.message}
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.isArray(filteredCampaigns) && filteredCampaigns.length > 0 ? filteredCampaigns.map((campaign: any) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-slate-500">{campaign.client?.companyName}</p>
                      {campaign.contractValue && (
                        <p className="text-xs text-green-600 font-medium">
                          R$ {parseFloat(campaign.contractValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCampaignAccessModal({ isOpen: true, campaign })}
                        title="Gerenciar acesso de colaboradores"
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openModal("campaign", campaign)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ type: "campaign", id: campaign.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-500">
                    {searchTerms.campaigns ? 'Nenhuma campanha encontrada para esta busca' : 'Nenhuma campanha cadastrada'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tipos de Tarefa ({filteredTaskTypes.length} de {taskTypes.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("taskType")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar tipos de tarefa..."
                value={searchTerms.taskTypes}
                onChange={(e) => setSearchTerms({...searchTerms, taskTypes: e.target.value})}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {taskTypesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : taskTypesError ? (
              <div className="text-center py-4 text-red-600">
                Erro ao carregar tipos de tarefa: {taskTypesError.message}
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.isArray(filteredTaskTypes) && filteredTaskTypes.length > 0 ? filteredTaskTypes.map((taskType: any) => (
                  <div key={taskType.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: taskType.color }}
                      />
                      <div>
                        <p className="font-medium">{taskType.name}</p>
                        <p className="text-sm text-slate-500">
                          {taskType.isBillable ? 'Faturável' : 'Não faturável'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal("taskType", taskType)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ type: "taskType", id: taskType.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-500">
                    {searchTerms.taskTypes ? 'Nenhum tipo de tarefa encontrado para esta busca' : 'Nenhum tipo de tarefa cadastrado'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>



        {/* Tarefas de Campanha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Tarefas de Campanha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Tarefas Específicas ({filteredCampaignTasks.length} de {campaignTasks.length})
                </p>
                <Button
                  onClick={() => {
                    setSelectedItem(null);
                    setSelectedModal("campaignTask");
                  }}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar tarefas por descrição ou campanha..."
                  value={searchTerms.campaignTasks}
                  onChange={(e) => setSearchTerms({...searchTerms, campaignTasks: e.target.value})}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-4">
              {campaignTasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-slate-500">Carregando tarefas...</div>
                </div>
              ) : Array.isArray(filteredCampaignTasks) && filteredCampaignTasks.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {filteredCampaignTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{task.description}</p>
                        {/* Nova visualização melhorada com cliente e campanha */}
                        <div className="text-sm text-slate-500 mt-1 space-y-1">
                          {task.campaign && task.campaign.client ? (
                            <p className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Cliente: {task.campaign.client.companyName || task.campaign.client.tradeName}
                            </p>
                          ) : (
                            <p className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Cliente: {clients.find(c => campaigns.find(camp => camp.id === task.campaignId)?.clientId === c.id)?.companyName || 'N/A'}
                            </p>
                          )}
                          {task.campaign ? (
                            <p className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Campanha: {task.campaign.name}
                            </p>
                          ) : (
                            <p className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Campanha: {campaigns.find(c => c.id === task.campaignId)?.name || 'N/A'}
                            </p>
                          )}
                          {task.taskType ? (
                            <p className="flex items-center gap-1">
                              <Tags className="w-3 h-3" />
                              Tipo: {task.taskType.name}
                            </p>
                          ) : (
                            <p className="flex items-center gap-1">
                              <Tags className="w-3 h-3" />
                              Tipo: {taskTypes.find(t => t.id === task.taskTypeId)?.name || 'N/A'}
                            </p>
                          )}
                        </div>
                        {task.taskType?.color && (
                          <div className="flex items-center gap-2 mt-1">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: task.taskType.color }}
                            />
                            <span className="text-xs text-slate-400">
                              {task.taskType.isBillable ? "Faturável" : "Não faturável"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Duplicar tarefa"
                          onClick={async () => {
                            try {
                              await apiRequest("POST", "/api/campaign-tasks", {
                                campaignId: task.campaignId,
                                taskTypeId: task.taskTypeId,
                                description: `${task.description} (Cópia)`,
                                isBillable: task.isBillable,
                                estimatedHours: task.estimatedHours
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/campaign-tasks"] });
                              toast({ title: "Tarefa duplicada com sucesso!" });
                            } catch (error: any) {
                              toast({
                                title: "Erro ao duplicar tarefa",
                                description: error.message,
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(task);
                            setSelectedModal("campaignTask");
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate({ type: "campaignTask", id: task.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>{searchTerms.campaignTasks ? 'Nenhuma tarefa encontrada para esta busca' : 'Nenhuma tarefa de campanha cadastrada'}</p>
                  <p className="text-sm">{!searchTerms.campaignTasks && 'Clique em "Nova Tarefa" para começar'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Departments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Departamentos ({filteredDepartments.length} de {departments.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("department")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar departamentos..."
                value={searchTerms.departments}
                onChange={(e) => setSearchTerms({...searchTerms, departments: e.target.value})}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {departmentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : departmentsError ? (
              <div className="text-center py-4 text-red-600">
                Erro ao carregar departamentos: {departmentsError.message}
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.isArray(filteredDepartments) && filteredDepartments.length > 0 ? filteredDepartments.map((department: any) => (
                  <div key={department.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{department.name}</p>
                        {!department.isActive && (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                      {department.description && (
                        <p className="text-sm text-slate-500">{department.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal("department", department)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ type: "department", id: department.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-500">
                    {searchTerms.departments ? 'Nenhum departamento encontrado para esta busca' : 'Nenhum departamento cadastrado'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Centers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Centros de Custo ({filteredCostCenters.length} de {costCenters.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("costCenter")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar centros de custo..."
                value={searchTerms.costCenters}
                onChange={(e) => setSearchTerms({...searchTerms, costCenters: e.target.value})}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {costCentersLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : costCentersError ? (
              <div className="text-center py-4 text-red-600">
                Erro ao carregar centros de custo: {costCentersError.message}
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.isArray(filteredCostCenters) && filteredCostCenters.length > 0 ? filteredCostCenters.map((costCenter: any) => (
                  <div key={costCenter.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{costCenter.name}</p>
                        <Badge variant="outline" className="text-xs">{costCenter.code}</Badge>
                        {!costCenter.isActive && (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                      {costCenter.description && (
                        <p className="text-sm text-slate-500">{costCenter.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal("costCenter", costCenter)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ type: "costCenter", id: costCenter.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-500">
                    {searchTerms.costCenters ? 'Nenhum centro de custo encontrado para esta busca' : 'Nenhum centro de custo cadastrado'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <Dialog open={!!selectedModal} onOpenChange={() => closeModal()}>
        {selectedModal === "user" && (
          <UserModal user={selectedItem} onClose={closeModal} />
        )}
        {selectedModal === "economicGroup" && (
          <EconomicGroupModal group={selectedItem} onClose={closeModal} />
        )}
        {selectedModal === "client" && (
          <ClientModal client={selectedItem} onClose={closeModal} />
        )}
        {selectedModal === "taskType" && (
          <TaskTypeModal taskType={selectedItem} onClose={closeModal} />
        )}
        {selectedModal === "campaign" && (
          <CampaignModal campaign={selectedItem} onClose={closeModal} />
        )}
        {selectedModal === "campaignTask" && (
          <CampaignTaskModal 
            campaignTask={selectedItem} 
            campaigns={campaigns}
            taskTypes={taskTypes}
            onClose={closeModal} 
          />
        )}
        {selectedModal === "department" && (
          <DepartmentModal department={selectedItem} onClose={closeModal} />
        )}
        {selectedModal === "costCenter" && (
          <CostCenterModal costCenter={selectedItem} onClose={closeModal} />
        )}
      </Dialog>

      {/* Modal de Acesso à Campanha */}
      <CampaignAccessModal
        isOpen={campaignAccessModal.isOpen}
        onClose={() => setCampaignAccessModal({ isOpen: false, campaign: null })}
        campaign={campaignAccessModal.campaign}
      />

      {/* Modal de Confirmação para Deletar Entradas de Teste */}
      <Dialog open={deleteEntriesModal} onOpenChange={setDeleteEntriesModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Deletar Entradas de Teste
                </DialogTitle>
                <DialogDescription>
                  Esta ação não pode ser desfeita
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para confirmar a exclusão de todas as entradas de teste, digite a senha de confirmação:
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Senha de confirmação:
              </label>
              <Input
                type="password"
                placeholder="Digite a senha..."
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full"
                data-testid="input-delete-password"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteEntriesModal(false);
                setDeletePassword("");
              }}
              disabled={isDeletingEntries}
              data-testid="button-cancel-delete"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTestEntries}
              disabled={isDeletingEntries || !deletePassword}
              data-testid="button-confirm-delete"
            >
              {isDeletingEntries ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}