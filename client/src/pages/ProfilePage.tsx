import { useAuth } from "@/hooks/useSimpleAuth";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Edit3, Mail, Calendar, Building, DollarSign, Lock } from "lucide-react";

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  position?: string;
  department?: string;
  contractType?: string;
  costCenter?: string;
  companyName?: string;
  cnpj?: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateUserData>({});
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Debug: Log user data
  console.log("Profile Page - User data:", user);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateUserData) => {
      const res = await apiRequest("PUT", `/api/usuarios/${user?.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao atualizar perfil");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditing(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/change-password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao alterar senha");
      }
      return await res.json();
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      position: user?.position || "",
      department: user?.department?.name || "",
      contractType: user?.contractType || "",
      costCenter: user?.costCenter?.name || "",
      companyName: user?.companyName || "",
      cnpj: user?.cnpj || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos de senha",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Carregando perfil...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">👤</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Usuário não encontrado</h2>
            <p className="text-slate-600">Não foi possível carregar as informações do perfil.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const userInitials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
            <p className="text-slate-600">Gerencie suas informações pessoais e profissionais</p>
          </div>
          {!isEditing && (
            <Button onClick={handleEdit} variant="outline">
              <Edit3 className="w-4 h-4 mr-2" />
              Editar Perfil
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Summary */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary font-bold text-2xl">{userInitials}</span>
              </div>
              <CardTitle className="text-lg">
                {user.firstName} {user.lastName}
              </CardTitle>
              <CardDescription className="flex items-center justify-center gap-2">
                <Badge variant={user.role === 'MASTER' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700">{user.email}</span>
              </div>
              {user.position && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700">{user.position}</span>
                </div>
              )}
              {user.department && (
                <div className="flex items-center gap-3 text-sm">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700">{user.department.name}</span>
                </div>
              )}
              {user.contractStartDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700">
                    Desde {new Date(user.contractStartDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informações Detalhadas</CardTitle>
              <CardDescription>
                {isEditing ? "Edite suas informações pessoais e profissionais" : "Visualize suas informações cadastradas"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">Primeiro Nome</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={formData.firstName || ""}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Digite seu primeiro nome"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md">
                      {user.firstName || "Não informado"}
                    </div>
                  )}
                </div>

                {/* Sobrenome */}
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={formData.lastName || ""}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Digite seu sobrenome"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md">
                      {user.lastName || "Não informado"}
                    </div>
                  )}
                </div>

                {/* Cargo */}
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  {isEditing ? (
                    <Input
                      id="position"
                      value={formData.position || ""}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="Ex: Desenvolvedor, Designer..."
                    />
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md">
                      {user.position || "Não informado"}
                    </div>
                  )}
                </div>

                {/* Departamento */}
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  {isEditing ? (
                    <Select
                      value={formData.department || ""}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Criação">Criação</SelectItem>
                        <SelectItem value="Conteúdo">Conteúdo</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Mídia">Mídia</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md">
                      {user.department?.name || "Não informado"}
                    </div>
                  )}
                </div>

                {/* Tipo de Contrato */}
                <div className="space-y-2">
                  <Label htmlFor="contractType">Tipo de Contrato</Label>
                  {isEditing ? (
                    <Select
                      value={formData.contractType || ""}
                      onValueChange={(value) => setFormData({ ...formData, contractType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md">
                      {user.contractType || "Não informado"}
                    </div>
                  )}
                </div>

                {/* Centro de Custo */}
                <div className="space-y-2">
                  <Label htmlFor="costCenter">Centro de Custo</Label>
                  {isEditing ? (
                    <Select
                      value={formData.costCenter || ""}
                      onValueChange={(value) => setFormData({ ...formData, costCenter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o centro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GBrasil">GBrasil</SelectItem>
                        <SelectItem value="GTodos">GTodos</SelectItem>
                        <SelectItem value="PPR">PPR</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md">
                      {user.costCenter?.name || "Não informado"}
                    </div>
                  )}
                </div>

                {/* Campos específicos para PJ */}
                {(user.contractType === 'PJ' || formData.contractType === 'PJ') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nome da Empresa</Label>
                      {isEditing ? (
                        <Input
                          id="companyName"
                          value={formData.companyName || ""}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Digite o nome da empresa"
                        />
                      ) : (
                        <div className="p-2 bg-slate-50 rounded-md">
                          {user.companyName || "Não informado"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      {isEditing ? (
                        <Input
                          id="cnpj"
                          value={formData.cnpj || ""}
                          onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                          placeholder="00.000.000/0000-00"
                        />
                      ) : (
                        <div className="p-2 bg-slate-50 rounded-md">
                          {user.cnpj || "Não informado"}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2 mt-6 pt-6 border-t">
                  <Button 
                    onClick={handleSave} 
                    disabled={updateMutation.isPending}
                    className="flex-1"
                  >
                    {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Change Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Atualize sua senha de acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Digite sua senha atual"
                  data-testid="input-current-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Digite a nova senha"
                  data-testid="input-new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirme a nova senha"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-6 border-t">
              <Button 
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}