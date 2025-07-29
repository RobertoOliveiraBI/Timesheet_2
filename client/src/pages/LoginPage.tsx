import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useSimpleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Clock, Users, BarChart3 } from "lucide-react";
import { Redirect, useLocation } from "wouter";

export default function LoginPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  // Helper function to get default route based on user role
  const getDefaultRoute = (user: any) => {
    // Todos os usuários vão para timesheet após login
    return "/timesheet";
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      const defaultRoute = getDefaultRoute(user);
      setLocation(defaultRoute);
    }
  }, [user, isLoading, setLocation]);

  // Redirect after successful login
  useEffect(() => {
    if (loginMutation.isSuccess && loginMutation.data) {
      const defaultRoute = getDefaultRoute(loginMutation.data);
      // Use setTimeout to ensure the user state is updated before redirect
      setTimeout(() => {
        setLocation(defaultRoute);
        // Force page refresh after 1 seconds to ensure proper loading
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 100);
    }
  }, [loginMutation.isSuccess, loginMutation.data, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, password });
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Tractionfy Timesheet</h1>
            <p className="text-gray-600 mt-2">Sistema de gestão de horas para agências</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fazer Login</CardTitle>
              <CardDescription>
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-600">
            <p>Usuários de teste:</p>
            <div className="mt-2 space-y-1">
              <p><strong>Master:</strong> roberto@tractionfy.com / 123mudar</p>
              <p><strong>Colaborador:</strong> roberto@cappei.com / 123mudar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 flex items-center justify-center">
        <div className="max-w-lg text-center space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-4">
              Gestão de Timesheet Inteligente
            </h2>
            <p className="text-xl text-indigo-100">
              Controle preciso de horas trabalhadas para agências de marketing
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-3 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Registro de Horas</h3>
                <p className="text-indigo-100">Acompanhamento em tempo real das atividades</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-3 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Gestão de Equipes</h3>
                <p className="text-indigo-100">Controle de acesso por papéis e aprovações</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Relatórios Detalhados</h3>
                <p className="text-indigo-100">Análises completas para tomada de decisão</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}