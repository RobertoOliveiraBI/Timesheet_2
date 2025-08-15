import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { 
  UserPlus, 
  Building, 
  FolderPlus, 
  ListTodo,
  Edit,
  Key,
  ChevronRight
} from "lucide-react";
import type { User } from "@shared/schema";

export function AdminSection() {
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: taskTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
  });

  const quickActions = [
    { icon: UserPlus, label: "Novo Usuário", color: "text-blue-600" },
    { icon: Building, label: "Novo Cliente", color: "text-green-600" },
    { icon: FolderPlus, label: "Nova Campanha", color: "text-purple-600" },
    { icon: ListTodo, label: "Tipo de Tarefa", color: "text-orange-600" },
  ];

  const systemSettings = [
    {
      title: "Fechamento automático mensal",
      description: "Bloqueia edições no mês anterior",
      enabled: true,
    },
    {
      title: "Notificações por email",
      description: "Avisa sobre aprovações pendentes",
      enabled: true,
    },
    {
      title: "Backup automático",
      description: "Exporta dados semanalmente",
      enabled: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Quick Actions */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="w-full justify-between p-3 h-auto"
                  >
                    <div className="flex items-center">
                      <Icon className={`w-5 h-5 mr-3 ${action.color}`} />
                      <span className="text-sm font-medium">{action.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usuários do Sistema</CardTitle>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                Carregando usuários...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                Erro ao carregar usuários: {error instanceof Error ? error.message : 'Erro desconhecido'}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Configure usuários para começar a usar o sistema.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Papel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Departamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={
                            user.role === 'MASTER' ? 'destructive' :
                            user.role === 'ADMIN' ? 'default' :
                            user.role === 'GESTOR' ? 'secondary' :
                            'outline'
                          }>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                          {user.department?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-reset-password-${user.id}`}
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Configuration */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Tarefa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskTypes.length === 0 ? (
                <div className="text-center py-4 text-slate-500">
                  Nenhum tipo de tarefa configurado.
                </div>
              ) : (
                taskTypes.map((taskType: any) => (
                  <div key={taskType.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: taskType.color }}
                      />
                      <div>
                        <p className="text-sm font-medium">{taskType.name}</p>
                        <p className="text-xs text-slate-500">
                          {taskType.isBillable ? 'Faturável' : 'Não faturável'}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemSettings.map((setting) => (
                <div key={setting.title} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{setting.title}</p>
                    <p className="text-xs text-slate-500">{setting.description}</p>
                  </div>
                  <Switch defaultChecked={setting.enabled} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
