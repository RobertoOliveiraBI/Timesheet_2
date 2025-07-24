import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Eye, Edit, Trash2, RefreshCw, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  DRAFT: { label: "Rascunho", variant: "secondary" as const },
  PENDING: { label: "Pendente", variant: "secondary" as const },
  APPROVED: { label: "Aprovado", variant: "default" as const },
  REJECTED: { label: "Rejeitado", variant: "destructive" as const },
};

const taskTypeColors: Record<string, string> = {
  "Criação": "bg-blue-100 text-blue-800",
  "Planejamento": "bg-purple-100 text-purple-800",
  "Apresentação": "bg-green-100 text-green-800",
  "Administrativo": "bg-gray-100 text-gray-800",
  "Alinhamento interno": "bg-orange-100 text-orange-800",
  "Treinamento": "bg-indigo-100 text-indigo-800",
};

export function RecentEntries() {
  const { data: timeEntries = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/time-entries"],
  });

  const formatHours = (hours: string | number) => {
    const h = parseFloat(hours.toString());
    const wholeHours = Math.floor(h);
    const minutes = Math.round((h - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lançamentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lançamentos Recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {timeEntries.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nenhum lançamento encontrado. Faça seu primeiro lançamento acima!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Campanha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Horas
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
                {timeEntries.slice(0, 10).map((entry: any) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {entry.campaign?.client?.companyName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {entry.campaign?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant="secondary"
                        className={cn(
                          "text-xs font-medium",
                          taskTypeColors[entry.taskType?.name] || "bg-gray-100 text-gray-800"
                        )}
                      >
                        {entry.taskType?.name || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {formatHours(entry.hours)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusConfig[entry.status as keyof typeof statusConfig]?.variant}>
                        {statusConfig[entry.status as keyof typeof statusConfig]?.label || entry.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      {entry.status === 'APPROVED' ? (
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      ) : entry.status === 'REJECTED' ? (
                        <>
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
