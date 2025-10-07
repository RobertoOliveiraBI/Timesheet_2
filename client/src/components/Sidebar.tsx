import { useAuth } from "@/hooks/useSimpleAuth";
import { cn } from "@/lib/utils";
import { 
  Clock,
  BarChart3,
  CheckCircle,
  Settings,
  User,
  LogOut,
  DollarSign,
  Upload,
  HelpCircle
} from "lucide-react";
import tractionfyLogo from "@assets/Tractionfy-purple-icon (1)_1754084442077.png";
import { useLocation } from "wouter";
import { useValidationCount } from "@/hooks/useValidationCount";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Lançar Horas", href: "/timesheet", icon: Clock, roles: ["MASTER", "ADMIN", "GESTOR", "COLABORADOR"] },
  { name: "Relatórios", href: "/reports", icon: BarChart3, roles: ["MASTER", "ADMIN", "GESTOR", "COLABORADOR"] },
  { name: "Área do Gestor", href: "/approvals", icon: CheckCircle, roles: ["MASTER", "ADMIN", "GESTOR"] },
  { name: "Custos de Campanha", href: "/campaign-costs", icon: DollarSign, roles: ["MASTER", "ADMIN", "GESTOR"] },
  { name: "Importação CSV", href: "/csv-import", icon: Upload, roles: ["MASTER", "ADMIN"] },
  { name: "Administração", href: "/admin", icon: Settings, roles: ["MASTER", "ADMIN"] },
  { name: "Suporte", href: "/support", icon: HelpCircle, roles: ["MASTER", "ADMIN", "GESTOR", "COLABORADOR"] },
];

export function Sidebar() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const validationCount = useValidationCount();




  
  // Se está carregando ou usuário não tem role, mostrar loading
  if (isLoading || !user || !user.role) {
    return (
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Carregando perfil...</p>
          </div>
        </div>
      </div>
    );
  }


  const userInitials = 
    `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50">
      {/* Sidebar header */}
      <div className="flex items-center px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-lg ring-1 ring-gray-200 p-2 hover:shadow-xl transition-shadow duration-200">
            <img 
              src={tractionfyLogo} 
              alt="Tractionfy Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="ml-4">
            <p className="text-xl font-bold text-slate-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tractionfy
            </p>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
              Timesheet Platform
            </p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary font-medium text-sm">{userInitials}</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-900">
              {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuário'}
            </p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation
            .filter((item) => item.roles.includes(user.role))
            .map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.name}
                  onClick={() => setLocation(item.href)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "text-primary bg-primary/5"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                  {item.name === "Área do Gestor" && validationCount > 0 && (
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-800 text-xs">
                      {validationCount}
                    </Badge>
                  )}
                </button>
              );
            })}
        </div>

        <div className="pt-6 mt-6 border-t border-slate-200">
          <button
            onClick={() => setLocation("/profile")}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <User className="w-5 h-5 mr-3" />
            Meu Perfil
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </button>
        </div>
      </nav>
    </div>
  );
}
