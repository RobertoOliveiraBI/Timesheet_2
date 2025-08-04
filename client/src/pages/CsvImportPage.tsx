import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Users, Building2, Briefcase, Database, FileText, DollarSign, Target } from "lucide-react";
import { CsvImportModal } from "@/components/CsvImportModal";

interface ImportEntity {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'users' | 'structure' | 'campaigns' | 'financial';
}

const importEntities: ImportEntity[] = [
  // Usuários
  {
    id: 'users',
    name: 'Usuários',
    description: 'Importar colaboradores, gestores e administradores',
    icon: Users,
    category: 'users'
  },

  // Estrutura Organizacional
  {
    id: 'economic-groups',
    name: 'Grupos Econômicos',
    description: 'Importar grupos econômicos e holdings',
    icon: Building2,
    category: 'structure'
  },
  {
    id: 'clients',
    name: 'Clientes',
    description: 'Importar empresas e clientes',
    icon: Briefcase,
    category: 'structure'
  },
  {
    id: 'departments',
    name: 'Departamentos',
    description: 'Importar departamentos organizacionais',
    icon: Database,
    category: 'structure'
  },
  {
    id: 'cost-centers',
    name: 'Centros de Custo',
    description: 'Importar centros de custo e contabilidade',
    icon: Target,
    category: 'structure'
  },

  // Campanhas e Projetos
  {
    id: 'campaigns',
    name: 'Campanhas',
    description: 'Importar campanhas e projetos',
    icon: FileText,
    category: 'campaigns'
  },
  {
    id: 'task-types',
    name: 'Tipos de Tarefa',
    description: 'Importar categorias de atividades',
    icon: FileText,
    category: 'campaigns'
  },
  {
    id: 'campaign-tasks',
    name: 'Tarefas de Campanha',
    description: 'Importar tarefas específicas para campanhas',
    icon: Target,
    category: 'campaigns'
  },

  // Financeiro
  {
    id: 'cost-categories',
    name: 'Categorias de Custo',
    description: 'Importar categorias de custos e despesas',
    icon: DollarSign,
    category: 'financial'
  },
  {
    id: 'campaign-costs',
    name: 'Custos de Campanha',
    description: 'Importar custos associados às campanhas',
    icon: DollarSign,
    category: 'financial'
  }
];

const categoryLabels = {
  users: 'Usuários',
  structure: 'Estrutura Organizacional',
  campaigns: 'Campanhas e Projetos',
  financial: 'Financeiro'
};

const categoryColors = {
  users: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  structure: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  campaigns: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  financial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
};

export function CsvImportPage() {
  const [selectedEntity, setSelectedEntity] = useState<ImportEntity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleImportClick = (entity: ImportEntity) => {
    setSelectedEntity(entity);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEntity(null);
  };

  const entitiesByCategory = importEntities.reduce((acc, entity) => {
    if (!acc[entity.category]) {
      acc[entity.category] = [];
    }
    acc[entity.category].push(entity);
    return acc;
  }, {} as Record<string, ImportEntity[]>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Upload className="h-8 w-8 text-primary" />
          Importação em Lote via CSV
        </h1>
        <p className="text-lg text-muted-foreground">
          Importe dados administrativos em massa usando arquivos CSV. 
          Baixe os templates, preencha com seus dados e importe rapidamente.
        </p>
      </div>

      {/* Instruções Gerais */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Como Usar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full p-3 w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-1">Baixar Template</h3>
              <p className="text-sm text-muted-foreground">
                Clique em uma categoria e baixe o template CSV
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full p-3 w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-1">Preencher Dados</h3>
              <p className="text-sm text-muted-foreground">
                Complete o arquivo com suas informações
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full p-3 w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-1">Importar</h3>
              <p className="text-sm text-muted-foreground">
                Faça upload do arquivo e execute a importação
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entidades por Categoria */}
      <div className="space-y-8">
        {Object.entries(entitiesByCategory).map(([category, entities]) => (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <Badge className={categoryColors[category as keyof typeof categoryColors]}>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {entities.length} {entities.length === 1 ? 'tipo disponível' : 'tipos disponíveis'}
              </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entities.map((entity) => {
                const IconComponent = entity.icon;
                return (
                  <Card key={entity.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        {entity.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {entity.description}
                      </p>
                      <Button 
                        onClick={() => handleImportClick(entity)}
                        className="w-full"
                        size="sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Importar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Importação */}
      {selectedEntity && (
        <CsvImportModal
          isOpen={modalOpen}
          onClose={closeModal}
          selectedEntity={selectedEntity.id}
          entityName={selectedEntity.name}
        />
      )}
    </div>
  );
}