

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = "Lançar Horas", subtitle = "Registre suas horas trabalhadas" }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600 mt-1">{subtitle}</p>
      </div>
    </header>
  );
}
