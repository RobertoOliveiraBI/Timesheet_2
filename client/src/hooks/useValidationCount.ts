import { useQuery } from "@tanstack/react-query";

export function useValidationCount() {
  const { data: validationCount = 0 } = useQuery<number>({
    queryKey: ["/api/time-entries/validation-count"],
    queryFn: async () => {
      const response = await fetch("/api/time-entries/validation-count", {
        credentials: "include"
      });
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count || 0;
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 30 * 1000, // Atualizar a cada 30 segundos
  });

  return validationCount;
}