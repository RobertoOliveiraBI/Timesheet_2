interface StatusBadgeProps {
  status: string;
  needsReview?: boolean;
  entryId?: number;
}

export function StatusBadge({ status, needsReview = false, entryId }: StatusBadgeProps) {
  if (needsReview && !entryId) {
    console.warn('StatusBadge: entryId is required when needsReview is true');
  }
  
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

      default:
        return {
          label: status || "Não definido",
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className="inline-flex items-center gap-1" data-testid={`status-badge-${status.toLowerCase()}`}>
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${config.className}`}>
        {config.label}
      </span>
      {needsReview && entryId && (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200" data-testid={`badge-revisar-${entryId}`}>
          ⚠️ Revisar
        </span>
      )}
    </div>
  );
}