import { useAuth } from "@/hooks/useSimpleAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManagerCollaboratorForm } from "@/components/manager/ManagerCollaboratorForm";
import { ManagerCampaignForm } from "@/components/manager/ManagerCampaignForm";
import { Users, Briefcase } from "lucide-react";

export function ManagerSection() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">
          Área de Gestão de Equipe
        </h3>
        <p className="text-sm text-blue-700">
          Cadastre novos colaboradores na sua equipe e crie campanhas com tarefas padrão automáticas.
        </p>
      </div>

      <Tabs defaultValue="collaborator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="collaborator" className="flex items-center gap-2" data-testid="tab-collaborator">
            <Users className="h-4 w-4" />
            Cadastrar Colaborador
          </TabsTrigger>
          <TabsTrigger value="campaign" className="flex items-center gap-2" data-testid="tab-campaign">
            <Briefcase className="h-4 w-4" />
            Cadastrar Campanha
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collaborator" className="mt-6">
          <ManagerCollaboratorForm currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="campaign" className="mt-6">
          <ManagerCampaignForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
