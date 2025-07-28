interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "RASCUNHO":
        return {
          label: "Rascunho",
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
      case "SALVO":
        return {
          label: "Salvo",
          className: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case "VALIDACAO":
        return {
          label: "Em Validação",
          className: "bg-yellow-100 text-yellow-800 border-yellow-200"
        };
      case "APROVADO":
        return {
          label: "Aprovado",
          className: "bg-green-100 text-green-800 border-green-200"
        };
      case "REJEITADO":
        return {
          label: "Rejeitado",
          className: "bg-red-100 text-red-800 border-red-200"
        };
      default:
        return {
          label: status || "Não definido",
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${config.className}`}>
      {config.label}
    </span>
  );
}