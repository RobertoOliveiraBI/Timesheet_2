import { useAuth } from "@/hooks/useSimpleAuth";
import { cn } from "@/lib/utils";
import { 
  Clock,
  BarChart3,
  CheckCircle,
  Settings,
  User,
  LogOut
} from "lucide-react";
import { useLocation } from "wouter";

const navigation = [
  { name: "Lançar Horas", href: "/timesheet", icon: Clock },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
  { name: "Área do Gestor", href: "/approvals", icon: CheckCircle },
  { name: "Administração", href: "/admin", icon: Settings },
];

export function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const userInitials = user ? 
    `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() : 
    'U';

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50">
      {/* Sidebar header */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-semibold text-slate-900">Tractionfy</p>
            <p className="text-xs text-slate-500">Timesheet</p>
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
              {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Usuário'}
            </p>
            <p className="text-xs text-slate-500">{user?.role || 'Colaborador'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => {
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
                {item.name === "Área do Gestor" && (
                  <span className="ml-auto bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                    3
                  </span>
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
