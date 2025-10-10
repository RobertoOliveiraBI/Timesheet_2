import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useSimpleAuth";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { TimesheetSemanal } from "@/components/TimesheetSemanal";
import { RecentEntries } from "@/components/RecentEntries";
import { ApprovalSection } from "@/components/ApprovalSection";
import { AdminSection } from "@/components/AdminSectionNew";
import { ApprovalManagement } from "@/components/ApprovalManagement";
import { ReportsSection } from "@/components/ReportsSection";
import CampaignCostsModule from "@/components/CampaignCostsModule";
import { CsvImportPage } from "@/pages/CsvImportPage";
import { ManagerSection } from "@/components/ManagerSection";
import { ReviewAlertModal } from "@/components/ReviewAlertModal";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Clock, 
  CheckCircle, 
  HourglassIcon, 
  TrendingUp 
} from "lucide-react";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // Função para formatar horas decimais em HH:MM
  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Helper function to get default route based on user role
  const getDefaultRoute = (user: any) => {
    // Todos os usuários vão para timesheet
    return "/timesheet";
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Não autenticado",
        description: "Você precisa fazer login para acessar esta página",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [user, isLoading, toast, setLocation]);

  // Redirect to appropriate page if user is on root path
  useEffect(() => {
    if (!isLoading && user && location === "/") {
      const defaultRoute = getDefaultRoute(user);
      setLocation(defaultRoute);
    }
  }, [user, isLoading, location, setLocation]);


  
  // Função para obter as datas do mês atual
  const getCurrentMonthDates = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      fromDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0]
    };
  };
  
  const monthDates = getCurrentMonthDates();



  const { data: monthStats } = useQuery<any>({
    queryKey: ["/api/reports/user-stats", monthDates.fromDate, monthDates.endDate, "month"],
    queryFn: async () => {
      const response = await fetch(`/api/reports/user-stats?fromDate=${monthDates.fromDate}&toDate=${monthDates.endDate}`, {
        credentials: "include"
      });
      if (!response.ok) return null;
      return response.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const getCurrentSection = () => {
    if (location === "/approvals") return "approvals";
    if (location === "/manager") return "manager";
    if (location === "/admin") return "admin";
    if (location === "/reports") return "reports";
    if (location === "/campaign-costs") return "campaign-costs";
    if (location === "/csv-import") return "csv-import";
    if (location === "/timesheet" || location === "/") return "timesheet";
    return "timesheet";
  };

  const getHeaderProps = () => {
    const section = getCurrentSection();
    const titles: Record<string, { title: string; subtitle: string }> = {
      timesheet: { title: "Lançar Horas", subtitle: "Registre suas horas trabalhadas" },
      reports: { title: "Relatórios", subtitle: "Analise a produtividade e rentabilidade" },
      approvals: { title: "Área do Gestor", subtitle: "Aprove ou rejeite lançamentos de horas" },
      manager: { title: "Gestão de Equipe", subtitle: "Cadastre colaboradores e campanhas" },
      admin: { title: "Administração", subtitle: "Gerencie usuários e configurações do sistema" },
      "campaign-costs": { title: "Custos de Campanha", subtitle: "Gerencie custos e despesas das campanhas" },
      "csv-import": { title: "Importação CSV", subtitle: "Importe dados administrativos em lote via CSV" },
    };
    return titles[section] || titles.timesheet;
  };

  const hasPermission = (section: string) => {
    if (!user?.role) {
      return false;
    }
    
    const permissions: Record<string, string[]> = {
      timesheet: ["MASTER", "ADMIN", "GESTOR", "COLABORADOR"],
      reports: ["MASTER", "ADMIN", "GESTOR", "COLABORADOR"],
      approvals: ["MASTER", "ADMIN", "GESTOR"],
      manager: ["MASTER", "ADMIN", "GESTOR"],
      admin: ["MASTER", "ADMIN"],
      "campaign-costs": ["MASTER", "ADMIN", "GESTOR"],
      "csv-import": ["MASTER", "ADMIN"],
    };
    
    return permissions[section]?.includes(user.role) || false;
  };

  const renderContent = () => {
    const section = getCurrentSection();
    
    // Check permissions
    if (!hasPermission(section)) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Acesso Negado</h2>
            <p className="text-slate-600">Você não tem permissão para acessar esta seção.</p>
          </div>
        </div>
      );
    }
    
    switch (section) {
      case "approvals":
        return <ApprovalManagement />;
      case "manager":
        return <ManagerSection />;
      case "admin":
        return <AdminSection />;
      case "reports":
        return <ReportsSection />;
      case "campaign-costs":
        return <CampaignCostsModule />;
      case "csv-import":
        return <CsvImportPage />;
      default:
        return (
          <div className="space-y-8">
            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Este mês"
                value={monthStats?.totalHours ? formatHours(monthStats.totalHours) : "0:00"}
                subtitle="Horas este mês"
                icon={Clock}
                iconColor="text-purple-600"
                iconBgColor="bg-purple-100"
              />
              <StatsCard
                title="Aprovadas"
                value={monthStats?.approvedHours ? formatHours(monthStats.approvedHours) : "0:00"}
                subtitle="Horas aprovadas"
                icon={CheckCircle}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
              />
              <StatsCard
                title="Pendentes"
                value={monthStats?.pendingHours ? formatHours(monthStats.pendingHours) : "0:00"}
                subtitle="Pendente aprovação"
                icon={HourglassIcon}
                iconColor="text-amber-600"
                iconBgColor="bg-amber-100"
              />
              <StatsCard
                title="Faturáveis"
                value={monthStats?.billableHours && monthStats?.totalHours ? `${Math.round((monthStats.billableHours / monthStats.totalHours) * 100)}%` : "0%"}
                subtitle="Horas faturáveis"
                icon={TrendingUp}
                iconColor="text-primary"
                iconBgColor="bg-primary/10"
              />
            </div>

            {/* Timesheet semanal em formato de planilha */}
            <TimesheetSemanal />
          </div>
        );
    }
  };

  const headerProps = getHeaderProps();
  
  return (
    <Layout>
      <ReviewAlertModal />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{headerProps.title}</h1>
        <p className="text-slate-600 mt-1">{headerProps.subtitle}</p>
      </div>
      {renderContent()}
    </Layout>
  );
}
