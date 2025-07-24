

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = "Lançar Horas", subtitle = "Registre suas horas trabalhadas" }: HeaderProps) {
  const getCurrentWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} a ${endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-600 mt-1">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">Semana atual</p>
          <p className="text-xs text-slate-500">{getCurrentWeek()}</p>
        </div>
      </div>
    </header>
  );
}
