import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NovaEntradaHoras } from "@/components/NovaEntradaHoras";
import { ListaEntradasHoras } from "@/components/ListaEntradasHoras";
import { Clock, List, Plus } from "lucide-react";

export function NovoTimesheet() {
  const [activeTab, setActiveTab] = useState("nova-entrada");

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Controle de Horas</h1>
          <p className="text-slate-600">
            Registre e acompanhe suas horas trabalhadas de forma simples e organizada
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="nova-entrada" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Entrada
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nova-entrada" className="mt-6">
            <NovaEntradaHoras />
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <ListaEntradasHoras />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}