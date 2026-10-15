import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListPlayers, useDeletePlayer, getListPlayersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Search, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const avatarColors = [
  "bg-emerald-500/20 text-emerald-400",
  "bg-blue-500/20 text-blue-400",
  "bg-purple-500/20 text-purple-400",
  "bg-orange-500/20 text-orange-400",
  "bg-pink-500/20 text-pink-400",
  "bg-cyan-500/20 text-cyan-400",
];

export default function Jugadores() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [club, setClub] = useState<any>(null);
  const [selectedSportId, setSelectedSportId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_sport_id");
      return saved ? Number(saved) : null;
    }
    return null;
  });
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clubs/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setClub(d);
        if (!selectedSportId && d?.sports?.length > 0) {
          const savedSportId = localStorage.getItem("selected_sport_id");
          const found = d.sports.find((s: any) => String(s.id) === savedSportId);
          setSelectedSportId(found ? found.id : d.sports[0].id);
        }
      })
      .catch(() => {});

    const handleSportChange = (e?: any) => {
      const id = e?.detail ?? (localStorage.getItem("selected_sport_id") ? Number(localStorage.getItem("selected_sport_id")) : null);
      if (id) setSelectedSportId(id);
    };

    window.addEventListener("sport_changed", handleSportChange);
    return () => window.removeEventListener("sport_changed", handleSportChange);
  }, []);

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsLoading(true);
    const url = selectedSportId ? `/api/players?sportId=${selectedSportId}` : "/api/players";
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPlayersList(Array.isArray(data) ? data : []))
      .catch(() => setPlayersList([]))
      .finally(() => setIsLoading(false));
  }, [selectedSportId]);

  const deleteMutation = useDeletePlayer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        const url = selectedSportId ? `/api/players?sportId=${selectedSportId}` : "/api/players";
        fetch(url).then((r) => r.json()).then((data) => setPlayersList(data)).catch(() => {});
      },
    },
  });

  const activeSport = club?.sports?.find((s: any) => s.id === selectedSportId) || club?.sports?.[0];
  const isClubFootball =
    selectedSportId === 3 ||
    activeSport?.slug === "futbol" ||
    activeSport?.name?.toLowerCase().includes("fútbol");

  const filteredPlayers = playersList?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.nickname && p.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = (id: number, name: string) => {
    if (confirm(t("jugadores.deleteConfirm", { name }))) {
      deleteMutation.mutate({ id });
    }
  };

  const openWhatsApp = (phone: string) => {
    // Limpia el número quitando caracteres no numéricos
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("jugadores.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("jugadores.count", { count: players?.length ?? 0 })}
          </p>
        </div>
        <Link
          href="/jugadores/nuevo"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          {t("jugadores.new")}
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder={t("jugadores.search")}
          className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : !playersList?.length ? (
        <div className="text-center py-20 text-muted-foreground">{t("jugadores.noPlayers")}</div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {filteredPlayers?.map((player: any, idx) => {
            const isFootball =
              isClubFootball ||
              player.isFootball ||
              player.sportSlug === "futbol" ||
              player.sportName?.toLowerCase().includes("fútbol");
            const points = isFootball ? (player.points ?? 0) : (player.elo ?? 1500);
            const label = isFootball ? "PTS (Liga)" : "Elo";
            const diff = player.goalDiff ?? ((player.goalsFor ?? 0) - (player.goalsAgainst ?? 0));

            return (
              <div key={player.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0", avatarColors[idx % avatarColors.length])}>
                  {initials(player.name)}
                </div>

                <Link href={`/jugadores/${player.id}`} className="flex-1 min-w-0 flex items-center justify-between group-hover:scale-[1.005] transition-transform">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{player.name}</p>
                    {player.nickname && <p className="text-[11px] text-muted-foreground uppercase tracking-wide">&quot;{player.nickname}&quot;</p>}
                    {isFootball && (
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        {player.wins ?? 0}PG · {player.draws ?? 0}PE · {player.losses ?? 0}PP · Dif: {diff > 0 ? `+${diff}` : diff}
                      </p>
                    )}
                  </div>
                  <div className="text-right mr-2 flex-shrink-0">
                    <span className="text-lg font-black text-primary tracking-tighter">{points}</span>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold -mt-1">{label}</p>
                  </div>
                </Link>

                <div className="flex items-center gap-1">
                  {player.phone && (
                    <button
                      onClick={() => openWhatsApp(player.phone)}
                      title={t("jugadores.chatWhatsApp")}
                      className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                    >
                      <MessageCircle size={15} />
                    </button>
                  )}
                  <Link href={`/jugadores/${player.id}/editar`} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                    <Pencil size={14} />
                  </Link>
                  <button onClick={() => handleDelete(player.id, player.name)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredPlayers?.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">{t("jugadores.noPlayers")}</div>
          )}
        </div>
      )}
    </div>
  );
}