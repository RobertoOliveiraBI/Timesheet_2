import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { TimesheetForm } from "@/components/TimesheetForm";
import { RecentEntries } from "@/components/RecentEntries";
import { ApprovalSection } from "@/components/ApprovalSection";
import { AdminSection } from "@/components/AdminSection";
import { ReportsSection } from "@/components/ReportsSection";
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
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: userStats } = useQuery({
    queryKey: ["/api/reports/user-stats"],
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

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const getCurrentSection = () => {
    if (location === "/approvals") return "approvals";
    if (location === "/admin") return "admin";
    if (location === "/reports") return "reports";
    return "timesheet";
  };

  const getHeaderProps = () => {
    const section = getCurrentSection();
    const titles = {
      timesheet: { title: "Lançar Horas", subtitle: "Registre suas horas trabalhadas" },
      reports: { title: "Relatórios", subtitle: "Analise a produtividade e rentabilidade" },
      approvals: { title: "Área do Gestor", subtitle: "Aprove ou rejeite lançamentos de horas" },
      admin: { title: "Administração", subtitle: "Gerencie usuários e configurações do sistema" },
    };
    return titles[section];
  };

  const renderContent = () => {
    const section = getCurrentSection();
    
    switch (section) {
      case "approvals":
        return <ApprovalSection />;
      case "admin":
        return <AdminSection />;
      case "reports":
        return <ReportsSection />;
      default:
        return (
          <div className="space-y-8">
            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatsCard
                title="Esta semana"
                value={userStats ? `${Math.round(userStats.totalHours || 0)}:00` : "0:00"}
                subtitle="Horas esta semana"
                icon={Clock}
                iconColor="text-blue-600"
                iconBgColor="bg-blue-100"
              />
              <StatsCard
                title="Aprovadas"
                value={userStats ? `${Math.round(userStats.approvedHours || 0)}:00` : "0:00"}
                subtitle="Horas aprovadas"
                icon={CheckCircle}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
              />
              <StatsCard
                title="Pendentes"
                value={userStats ? `${Math.round(userStats.pendingHours || 0)}:00` : "0:00"}
                subtitle="Pendente aprovação"
                icon={HourglassIcon}
                iconColor="text-amber-600"
                iconBgColor="bg-amber-100"
              />
              <StatsCard
                title="Faturáveis"
                value={userStats ? `${Math.round((userStats.billableHours / (userStats.totalHours || 1)) * 100)}%` : "0%"}
                subtitle="Horas faturáveis"
                icon={TrendingUp}
                iconColor="text-primary"
                iconBgColor="bg-primary/10"
              />
            </div>

            {/* Timesheet entry form */}
            <TimesheetForm />

            {/* Recent entries */}
            <RecentEntries />
          </div>
        );
    }
  };

  return (
    <Layout>
      <Header {...getHeaderProps()} />
      {renderContent()}
    </Layout>
  );
}
