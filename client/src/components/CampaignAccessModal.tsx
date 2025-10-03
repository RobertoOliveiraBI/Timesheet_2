import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, UserMinus, Users } from "lucide-react";

interface CampaignAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: any;
}

export function CampaignAccessModal({ isOpen, onClose, campaign }: CampaignAccessModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar colaboradores da campanha
  const { data: campaignCollaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: [`/api/campanhas/${campaign?.id}/colaboradores`],
    enabled: !!campaign?.id && isOpen,
    queryFn: async () => {
      const response = await fetch(`/api/campanhas/${campaign.id}/colaboradores`, {
        credentials: "include",
      });
      return response.ok ? await response.json() : [];
    },
  });

  // Buscar todos os colaboradores disponíveis
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/usuarios"],
    enabled: isOpen,
    queryFn: async () => {
      const response = await fetch("/api/usuarios", {
        credentials: "include",
      });
      return response.ok ? await response.json() : [];
    },
  });

  // Filtrar apenas colaboradores
  const allCollaborators = allUsers.filter((user: any) => user.role === "COLABORADOR");

  // Colaboradores que ainda não têm acesso
  const availableCollaborators = allCollaborators.filter(
    (user: any) => !campaignCollaborators.some((cc: any) => cc.id === user.id)
  );

  // Mutation para adicionar colaborador
  const addCollaboratorMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/campanhas/${campaign.id}/colaboradores`, {
        userId: parseInt(userId),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Colaborador adicionado à campanha!",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/campanhas/${campaign.id}/colaboradores`] 
      });
      setSelectedUserId("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao adicionar colaborador",
        variant: "destructive",
      });
    },
  });

  // Mutation para remover colaborador
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/campanhas/${campaign.id}/colaboradores/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Colaborador removido da campanha!",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/campanhas/${campaign.id}/colaboradores`] 
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover colaborador",
        variant: "destructive",
      });
    },
  });

  const handleAddCollaborator = () => {
    if (selectedUserId) {
      addCollaboratorMutation.mutate(selectedUserId);
    }
  };

  const handleRemoveCollaborator = (userId: number) => {
    removeCollaboratorMutation.mutate(userId);
  };

  if (!campaign) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gerenciar Acesso à Campanha: {campaign.name}
          </DialogTitle>
          <DialogDescription>
            Configure quais colaboradores têm acesso a esta campanha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar novo colaborador */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={availableCollaborators.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue 
                      placeholder={
                        availableCollaborators.length === 0 
                          ? "Todos os colaboradores já têm acesso" 
                          : "Selecione um colaborador"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCollaborators.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddCollaborator}
                  disabled={!selectedUserId || addCollaboratorMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de colaboradores com acesso */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Colaboradores com Acesso ({campaignCollaborators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCollaborators ? (
                <div className="text-center py-4 text-gray-500">
                  Carregando colaboradores...
                </div>
              ) : campaignCollaborators.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Nenhum colaborador tem acesso a esta campanha
                </div>
              ) : (
                <div className="space-y-2">
                  {campaignCollaborators.map((collaborator: any) => {
                    const user = collaborator.user || collaborator;
                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {(user.firstName || "U")[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{user.role}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveCollaborator(user.id)}
                            disabled={removeCollaboratorMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}