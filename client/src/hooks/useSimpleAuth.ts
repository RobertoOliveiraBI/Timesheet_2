import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginCredentials = {
  email: string;
  password: string;
};

export function useAuth() {
  const { toast } = useToast();
  
  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
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
      return userData as User;
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

  // Debug para capturar o problema
  if (user && Object.keys(user).length === 0) {
    console.log("DEBUG useAuth: Usuário retornado como objeto vazio");
    alert("DEBUG: useAuth retornou objeto vazio - possível problema de cache");
  }

  return {
    user: user ?? null,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
  };
}