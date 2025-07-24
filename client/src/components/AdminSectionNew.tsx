import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
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
  Tags
} from "lucide-react";
import { UserModal, EconomicGroupModal, ClientModal, CampaignModal, TaskTypeModal, CampaignTaskModal } from "./AdminModals";

export function AdminSection() {
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
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

  const { data: systemConfig = {}, error: configError, isLoading: configLoading } = useQuery<any>({
    queryKey: ["/api/config"],
    queryFn: async () => {
      const response = await fetch("/api/config", {
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

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Record<string, any>) => {
      await apiRequest("PATCH", "/api/config", config);
    },
    onSuccess: () => {
      toast({ title: "Configurações atualizadas!" });
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
    },
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

  const handleConfigChange = (key: string, value: boolean) => {
    updateConfigMutation.mutate({ [key]: value });
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={action.action}
              >
                <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center text-white`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">{action.title}</p>
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
              Usuários do Sistema ({users.length})
            </CardTitle>
            <Button onClick={() => openModal("user")}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                ) : users && users.length > 0 ? users.map((user: any) => (
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
                    <td className="p-3">{user.department}</td>
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
              <CardTitle className="text-lg">Grupos Econômicos</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("economicGroup")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
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
              <div className="space-y-3">
                {Array.isArray(economicGroups) && economicGroups.length > 0 ? economicGroups.map((group: any) => (
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
                    Nenhum grupo econômico cadastrado
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
              <CardTitle className="text-lg">Clientes</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("client")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
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
              <div className="space-y-3">
                {Array.isArray(clients) && clients.length > 0 ? clients.map((client: any) => (
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
                    Nenhum cliente cadastrado
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
              <div className="space-y-3">
                {Array.isArray(campaigns) && campaigns.length > 0 ? campaigns.map((campaign: any) => (
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
                    Nenhuma campanha cadastrada
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
              <CardTitle className="text-lg">Tipos de Tarefa</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openModal("taskType")}>
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
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
              <div className="space-y-3">
                {Array.isArray(taskTypes) && taskTypes.length > 0 ? taskTypes.map((taskType: any) => (
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
                    Nenhum tipo de tarefa cadastrado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Fechamento Automático Mensal</p>
                  <p className="text-sm text-slate-500">Fechar automaticamente os lançamentos mensais</p>
                </div>
                <Switch
                  checked={systemConfig.fechamento_automatico || false}
                  onCheckedChange={(checked) => handleConfigChange("fechamento_automatico", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificações por Email</p>
                  <p className="text-sm text-slate-500">Enviar notificações via email</p>
                </div>
                <Switch
                  checked={systemConfig.notificacao_email || false}
                  onCheckedChange={(checked) => handleConfigChange("notificacao_email", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Backup Automático Semanal</p>
                  <p className="text-sm text-slate-500">Realizar backup automático dos dados</p>
                </div>
                <Switch
                  checked={systemConfig.backup_automatico || false}
                  onCheckedChange={(checked) => handleConfigChange("backup_automatico", checked)}
                />
              </div>
            </div>
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                Gerencie tarefas específicas de cada campanha
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

            <div className="space-y-4">
              {campaignTasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-slate-500">Carregando tarefas...</div>
                </div>
              ) : Array.isArray(campaignTasks) && campaignTasks.length > 0 ? (
                <div className="space-y-3">
                  {campaignTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{task.description}</p>
                        <p className="text-sm text-slate-500">
                          {task.campaign?.name} • {task.taskType?.name}
                        </p>
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
                  <p>Nenhuma tarefa de campanha cadastrada</p>
                  <p className="text-sm">Clique em "Nova Tarefa" para começar</p>
                </div>
              )}
            </div>
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
      </Dialog>
    </div>
  );
}