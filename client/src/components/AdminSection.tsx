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

export function AdminSection() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => {
      // This would be a real endpoint in production
      return Promise.resolve([]);
    }
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
            {users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Configure usuários para começar a usar o sistema.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Papel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Departamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* This would show actual users in production */}
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
