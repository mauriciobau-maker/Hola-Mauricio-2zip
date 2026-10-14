import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface ParrynSportOption {
  id?: number;
  name: string;
  slug: string;
  emoji: string;
}

interface ParrynSportContextValue {
  sports: ParrynSportOption[];
  activeSport: ParrynSportOption;
  activeClubId: number | null;
  selectSport: (slug: string) => void;
  showSportSelector: boolean;
}

interface ParrynSportProviderProps {
  club: any;
  user: any;
  children: ReactNode;
}

const PADEL_DEFAULT: ParrynSportOption = {
  name: "Pádel",
  slug: "padel",
  emoji: "🎾",
};

const defaultValue: ParrynSportContextValue = {
  sports: [PADEL_DEFAULT],
  activeSport: PADEL_DEFAULT,
  activeClubId: null,
  selectSport: () => undefined,
  showSportSelector: false,
};

const ParrynSportContext = createContext<ParrynSportContextValue>(defaultValue);

function normalizedText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeSport(raw: any): ParrynSportOption | null {
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  const rawSlug = typeof raw?.slug === "string" ? raw.slug.trim().toLowerCase() : "";
  const identity = normalizedText(`${rawSlug} ${name}`);

  let slug = rawSlug;
  if (identity.includes("futbol") || identity.includes("soccer")) slug = "futbol";
  else if (identity.includes("tenis") || identity.includes("tennis")) slug = "tenis";
  else if (identity.includes("padel")) slug = "padel";
  else if (!slug && name) slug = normalizedText(name).replace(/[^a-z0-9]+/g, "-");

  if (!slug) return null;

  const canonicalName =
    slug === "futbol" ? "Fútbol" :
    slug === "tenis" ? "Tenis" :
    slug === "padel" ? "Pádel" :
    name || slug;

  return {
    id: typeof raw?.id === "number" ? raw.id : undefined,
    name: canonicalName,
    slug,
    emoji: slug === "futbol" ? "⚽" : "🎾",
  };
}

function getClubSports(club: any): ParrynSportOption[] {
  const configuredSports = Array.isArray(club?.sports)
    ? club.sports.filter((sport: any) => sport && sport.active !== false)
    : [];
  const uniqueSports = new Map<string, ParrynSportOption>();

  for (const rawSport of configuredSports) {
    const sport = normalizeSport(rawSport);
    if (sport) uniqueSports.set(sport.slug, sport);
  }

  if (uniqueSports.size > 0) return Array.from(uniqueSports.values());

  const fallbackSport = normalizeSport({
    name: club?.isFootball || normalizedText(club?.name).includes("futbol")
      ? "Fútbol"
      : club?.name,
    slug: club?.isFootball || normalizedText(club?.name).includes("futbol")
      ? "futbol"
      : undefined,
  });

  return fallbackSport ? [fallbackSport] : [PADEL_DEFAULT];
}

export function ParrynSportProvider({ club, user, children }: ParrynSportProviderProps) {
  const sports = useMemo(() => getClubSports(club), [club]);
  const optionsKey = sports.map((sport) => sport.slug).join("|");
  const clubId = club?.id ?? user?.clubId ?? "default";
  const parsedClubId = Number(clubId);
  const activeClubId = Number.isSafeInteger(parsedClubId) && parsedClubId > 0 ? parsedClubId : null;
  const storageKey = `parryn:active-sport:${clubId}`;
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    const fallbackSlug = sports[0]?.slug ?? PADEL_DEFAULT.slug;
    try {
      const storedSlug = window.localStorage.getItem(storageKey);
      setSelectedSlug(sports.some((sport) => sport.slug === storedSlug) ? storedSlug : fallbackSlug);
    } catch {
      setSelectedSlug(fallbackSlug);
    }
  }, [storageKey, optionsKey, sports]);

  useEffect(() => {
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === storageKey && sports.some((sport) => sport.slug === event.newValue)) {
        setSelectedSlug(event.newValue);
      }
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, [storageKey, sports]);

  const selectSport = useCallback((slug: string) => {
    if (!sports.some((sport) => sport.slug === slug)) return;
    setSelectedSlug(slug);
    try {
      window.localStorage.setItem(storageKey, slug);
    } catch {
      // The in-memory selection still works when browser storage is unavailable.
    }
  }, [sports, storageKey]);

  const activeSport = sports.find((sport) => sport.slug === selectedSlug) ?? sports[0] ?? PADEL_DEFAULT;
  const value = useMemo<ParrynSportContextValue>(() => ({
    sports,
    activeSport,
    activeClubId,
    selectSport,
    showSportSelector: sports.length >= 2,
  }), [sports, activeSport, activeClubId, selectSport]);

  return <ParrynSportContext.Provider value={value}>{children}</ParrynSportContext.Provider>;
}

export function useParrynSport(): ParrynSportContextValue {
  return useContext(ParrynSportContext);
}
