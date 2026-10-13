import { useLanguage } from "../context/LanguageContext";
import { useParrynSport } from "../context/ParrynSportContext";

interface ParrynSportSelectorProps {
  className?: string;
  compact?: boolean;
}

export function ParrynSportSelector({ className = "", compact = false }: ParrynSportSelectorProps) {
  const { language } = useLanguage();
  const { sports, activeSport, selectSport, showSportSelector } = useParrynSport();

  if (!showSportSelector) return null;

  const label = language === "en" ? "Parryn sport" : language === "pt" ? "Esporte do Parryn" : "Deporte de Parryn";

  return (
    <label className={`flex ${compact ? "items-center gap-2" : "flex-col gap-1.5"} ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        data-testid="select-parryn-sport"
        value={activeSport.slug}
        onChange={(event) => selectSport(event.target.value)}
        className="min-w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {sports.map((sport) => (
          <option key={sport.slug} value={sport.slug}>
            {sport.emoji} {sport.name}
          </option>
        ))}
      </select>
    </label>
  );
}
