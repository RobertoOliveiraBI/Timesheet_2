import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserWithRelations } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginCredentials = {
  email: string;
  password: string;
};

export function useAuth() {
  const { toast } = useToast();
  
  const { data: user, error, isLoading } = useQuery<UserWithRelations | null, Error>({
    queryKey: ["/api/user"],
    retry: 1,
    retryOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Sempre buscar dados frescos
    gcTime: 5 * 60 * 1000, // 5 minutos
    queryFn: async () => {
      const res = await fetch("/api/user", {
        credentials: "include",
      });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      const userData = await res.json();
      
      // Validar se userData tem as propriedades essenciais
      if (userData && (!userData.id || !userData.role)) {
        console.error("Dados de usuário inválidos recebidos:", userData);
        throw new Error("Dados de usuário inválidos");
      }
      
      return userData as UserWithRelations;
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login falhou");
      }

      const userData = await response.json();
      return userData;
    },
    onSuccess: (userData) => {
      // Set user data immediately and invalidate to refetch
      queryClient.setQueryData(["/api/user"], userData);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${userData.firstName || userData.email}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verificar se dados do usuário são válidos
  const isValidUser = user && typeof user === 'object' && user.id && user.role;
  
  // Se user existe mas é inválido (objeto vazio ou sem propriedades essenciais)
  if (user && !isValidUser) {
    // Em vez de invalidar cache, retornar como loading até dados válidos chegarem
    return {
      user: null,
      isLoading: true,
      error,
      loginMutation,
      logoutMutation,
    };
  }

  return {
    user: user ?? null,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
  };
}