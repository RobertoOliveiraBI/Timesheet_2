import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useSimpleAuth";
import Landing from "@/pages/Landing";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!user ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={LoginPage} />
          <Route component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/login" component={Dashboard} />
          <Route path="/timesheet" component={Dashboard} />
          <Route path="/reports" component={Dashboard} />
          <Route path="/approvals" component={Dashboard} />
          <Route path="/admin" component={Dashboard} />
          <Route path="/profile" component={ProfilePage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function getDefaultSection(user: any) {
  // Redireciona baseado no papel do usuário
  if (user.role === "MASTER") return "admin";
  if (user.role === "ADMIN") return "admin";
  if (user.role === "GESTOR") return "approvals";
  return "timesheet";
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
