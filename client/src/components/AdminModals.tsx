import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2 } from "lucide-react";

// Modal para Usuários
export function UserModal({ user, onClose }: { user?: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    email: user?.email || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    password: "",
    role: user?.role || "COLABORADOR",
    position: user?.position || "",
    isManager: user?.isManager || false,
    managerId: user?.managerId || null,
    contractType: user?.contractType || "CLT",
    costCenter: user?.costCenter || "GBrasil",
    department: user?.department || "Criação",
    contractStartDate: user?.contractStartDate || "",
    contractEndDate: user?.contractEndDate || "",
    contractValue: user?.contractValue || "",
    companyName: user?.companyName || "",
    cnpj: user?.cnpj || "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar lista de gestores
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/usuarios"],
    queryFn: async () => {
      const response = await fetch("/api/usuarios", {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      return response.json();
    },
  });

  // Filtrar apenas gestores (isManager = true ou role = MASTER/ADMIN)
  const managers = allUsers.filter(u => 
    u.isManager || ['MASTER', 'ADMIN'].includes(u.role)
  );

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (user) {
        return await apiRequest("PATCH", `/api/usuarios/${user.id}`, data);
      } else {
        return await apiRequest("POST", "/api/usuarios", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: user ? "Usuário atualizado!" : "Usuário criado!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar usuário",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data, converting empty strings to null for date fields
    const dataToSend = {
      ...formData,
      contractStartDate: formData.contractStartDate || null,
      contractEndDate: formData.contractEndDate || null,
      contractValue: formData.contractValue || null,
      // Se é gestor, não deve ter um gestor (managerId = null)
      managerId: formData.isManager ? null : formData.managerId,
    };
    
    // Remove password if empty (for updates)
    let finalData = dataToSend;
    if (user && !dataToSend.password) {
      const { password, ...dataWithoutPassword } = dataToSend;
      finalData = dataWithoutPassword;
    }
    
    saveMutation.mutate(finalData);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{user ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Sobrenome</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        {!user && (
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="role">Papel</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                <SelectItem value="GESTOR">Gestor</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MASTER">Master</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="position">Cargo</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contractType">Regime de Contratação</Label>
            <Select value={formData.contractType} onValueChange={(value) => setFormData({ ...formData, contractType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLT">CLT</SelectItem>
                <SelectItem value="PJ">PJ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="costCenter">Centro de Resultado</Label>
            <Select value={formData.costCenter} onValueChange={(value) => setFormData({ ...formData, costCenter: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GBrasil">GBrasil</SelectItem>
                <SelectItem value="GTodos">GTodos</SelectItem>
                <SelectItem value="PPR">PPR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="department">Departamento</Label>
          <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Criação">Criação</SelectItem>
              <SelectItem value="Conteúdo">Conteúdo</SelectItem>
              <SelectItem value="Design">Design</SelectItem>
              <SelectItem value="Mídia">Mídia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.contractType === "PJ" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Razão Social</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="isManager"
            checked={formData.isManager}
            onCheckedChange={(checked) => setFormData({ ...formData, isManager: checked })}
          />
          <Label htmlFor="isManager">É gestor</Label>
        </div>

        {!formData.isManager && (
          <div>
            <Label htmlFor="managerId">Gestor Responsável</Label>
            <Select 
              value={formData.managerId?.toString() || "none"} 
              onValueChange={(value) => setFormData({ ...formData, managerId: value === "none" ? null : parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um gestor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem gestor</SelectItem>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id.toString()}>
                    {manager.firstName} {manager.lastName} ({manager.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-500 mt-1">
              Este gestor receberá as horas para aprovação
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// Modal para Grupos Econômicos
export function EconomicGroupModal({ group, onClose }: { group?: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: group?.name || "",
    description: group?.description || "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (group) {
        return await apiRequest("PATCH", `/api/grupos/${group.id}`, data);
      } else {
        return await apiRequest("POST", "/api/grupos", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: group ? "Grupo atualizado!" : "Grupo criado!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/grupos"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar grupo",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{group ? "Editar Grupo Econômico" : "Novo Grupo Econômico"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// Modal para Clientes
export function ClientModal({ client, onClose }: { client?: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    companyName: client?.companyName || "",
    tradeName: client?.tradeName || "",
    cnpj: client?.cnpj || "",
    email: client?.email || "",
    economicGroupId: client?.economicGroupId?.toString() || "",
  });

  const { data: economicGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/grupos"],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        economicGroupId: data.economicGroupId ? parseInt(data.economicGroupId) : null,
      };
      
      if (client) {
        return await apiRequest("PATCH", `/api/clientes/${client.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/clientes", payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: client ? "Cliente atualizado!" : "Cliente criado!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar cliente",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="companyName">Razão Social</Label>
          <Input
            id="companyName"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="tradeName">Nome Fantasia</Label>
          <Input
            id="tradeName"
            value={formData.tradeName}
            onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="economicGroupId">Grupo Econômico</Label>
          <Select value={formData.economicGroupId} onValueChange={(value) => setFormData({ ...formData, economicGroupId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar grupo" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(economicGroups) && economicGroups.map((group: any) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// Modal para Tipos de Tarefa  
// Modal para Tarefas de Campanha
export function CampaignTaskModal({ 
  campaignTask, 
  campaigns, 
  taskTypes, 
  onClose 
}: { 
  campaignTask?: any; 
  campaigns: any[]; 
  taskTypes: any[]; 
  onClose: () => void 
}) {
  const [formData, setFormData] = useState({
    campaignId: campaignTask?.campaignId || "",
    taskTypeId: campaignTask?.taskTypeId || "",
    description: campaignTask?.description || "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.campaignId || !formData.taskTypeId || !formData.description.trim()) {
        throw new Error("Todos os campos são obrigatórios");
      }

      const cleanData = {
        campaignId: parseInt(formData.campaignId),
        taskTypeId: parseInt(formData.taskTypeId),
        description: formData.description.trim(),
      };

      const response = campaignTask 
        ? await apiRequest("PATCH", `/api/campaign-tasks/${campaignTask.id}`, cleanData)
        : await apiRequest("POST", "/api/campaign-tasks", cleanData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar tarefa");
      }

      toast({
        title: campaignTask ? "Tarefa atualizada!" : "Tarefa criada!",
        description: campaignTask ? "A tarefa foi atualizada com sucesso." : "A nova tarefa foi criada com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/campaign-tasks"] });
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {campaignTask ? "Editar Tarefa" : "Nova Tarefa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="campaignId">Campanha *</Label>
            <Select 
              value={formData.campaignId} 
              onValueChange={(value) => setFormData({ ...formData, campaignId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id.toString()}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="taskTypeId">Tipo de Tarefa *</Label>
            <Select 
              value={formData.taskTypeId} 
              onValueChange={(value) => setFormData({ ...formData, taskTypeId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descrição da Tarefa *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva a tarefa específica..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {campaignTask ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskTypeModal({ taskType, onClose }: { taskType?: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: taskType?.name || "",
    description: taskType?.description || "",
    color: taskType?.color || "#3b82f6",
    isBillable: taskType?.isBillable ?? true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!data.name?.trim()) {
        throw new Error("Nome é obrigatório");
      }
      
      const cleanData = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        color: data.color,
        isBillable: Boolean(data.isBillable),
      };
      
      const url = taskType ? `/api/tipos-tarefa/${taskType.id}` : "/api/tipos-tarefa";
      const method = taskType ? "PATCH" : "POST";
      return await apiRequest(method, url, cleanData);
    },
    onSuccess: () => {
      toast({ 
        title: taskType ? "Tipo de tarefa atualizado!" : "Tipo de tarefa criado!",
        description: "Operação realizada com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/task-types"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar operação",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{taskType ? "Editar Tipo de Tarefa" : "Novo Tipo de Tarefa"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="taskTypeName">Nome</Label>
          <Input
            id="taskTypeName"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="taskTypeDescription">Descrição</Label>
          <Textarea
            id="taskTypeDescription"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="taskTypeColor">Cor</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="taskTypeColor"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-16 h-10"
            />
            <Input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="#3b82f6"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="taskTypeIsBillable"
            checked={formData.isBillable}
            onCheckedChange={(checked) => setFormData({ ...formData, isBillable: checked })}
          />
          <Label htmlFor="taskTypeIsBillable">Tarefa faturável</Label>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}


// Modal para Campanhas
export function CampaignModal({ campaign, onClose }: { campaign?: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: campaign?.name || "",
    description: campaign?.description || "",
    contractStartDate: campaign?.contractStartDate || "",
    contractEndDate: campaign?.contractEndDate || "",
    contractValue: campaign?.contractValue || "",
    clientId: campaign?.clientId || null,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar clientes para o select
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clientes"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!data.name?.trim()) {
        throw new Error("Nome da campanha é obrigatório");
      }
      if (!data.clientId) {
        throw new Error("Cliente é obrigatório");
      }
      
      const cleanData = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        contractStartDate: data.contractStartDate || null,
        contractEndDate: data.contractEndDate || null,
        contractValue: data.contractValue ? data.contractValue.toString() : null,
        clientId: parseInt(data.clientId),
      };
      
      const url = campaign ? `/api/campaigns/${campaign.id}` : "/api/campaigns";
      const method = campaign ? "PATCH" : "POST";
      return await apiRequest(method, url, cleanData);
    },
    onSuccess: () => {
      toast({ 
        title: campaign ? "Campanha atualizada!" : "Campanha criada!",
        description: "Operação realizada com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar operação",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{campaign ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="campaignName">Nome da Campanha</Label>
          <Input
            id="campaignName"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="campaignDescription">Descrição</Label>
          <Textarea
            id="campaignDescription"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="clientId">Cliente</Label>
          <Select 
            value={formData.clientId?.toString() || ""} 
            onValueChange={(value) => setFormData({ ...formData, clientId: value ? parseInt(value) : null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contractStartDate">Data de Início</Label>
            <Input
              id="contractStartDate"
              type="date"
              value={formData.contractStartDate}
              onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="contractEndDate">Data de Fim</Label>
            <Input
              id="contractEndDate"
              type="date"
              value={formData.contractEndDate}
              onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="contractValue">Valor do Contrato (R$)</Label>
          <Input
            id="contractValue"
            type="text"
            value={formData.contractValue}
            onChange={(e) => {
              // Remove tudo que não for número ou vírgula/ponto
              let value = e.target.value.replace(/[^\d.,]/g, '');
              // Substitui vírgula por ponto para cálculos
              value = value.replace(',', '.');
              // Limita a 2 casas decimais
              const parts = value.split('.');
              if (parts.length > 2) {
                value = parts[0] + '.' + parts[1];
              }
              if (parts[1] && parts[1].length > 2) {
                value = parts[0] + '.' + parts[1].substring(0, 2);
              }
              setFormData({ ...formData, contractValue: value });
            }}
            placeholder="0,00"
          />
          <p className="text-xs text-slate-500 mt-1">
            Ex: 15000,00 ou 15000.50
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
