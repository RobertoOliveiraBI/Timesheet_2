import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
            <Clock className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tractionfy</h1>
          <p className="text-slate-600">Sistema de Gestão de Timesheet</p>
        </div>

        {/* Login card */}
        <Card className="shadow-xl border border-slate-200">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Bem-vindo de volta
                </h2>
                <p className="text-slate-600">
                  Faça login para acessar o sistema de timesheet
                </p>
              </div>
              
              <Button 
                onClick={handleLogin}
                className="w-full bg-primary hover:bg-primary/90 py-3"
              >
                Entrar com Replit
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-slate-500">
                  Entre em contato com o administrador para acesso
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
