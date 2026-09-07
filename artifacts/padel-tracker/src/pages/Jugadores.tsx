import { useState } from "react";
import { Link } from "wouter";
import { useListPlayers } from "@workspace/api-client-react";
import { Plus, Pencil, Search, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { data: players, isLoading } = useListPlayers();
  const [search, setSearch] = useState("");

  const filteredPlayers = players?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.nickname && p.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  const openWhatsApp = (phone: string) => {
    // Limpia el número quitando caracteres no numéricos
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jugadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {players?.length ?? 0} registrados
          </p>
        </div>
        <Link
          href="/jugadores/nuevo"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Nuevo
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Buscar por nombre o apodo..."
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
      ) : !players?.length ? (
        <div className="text-center py-20 text-muted-foreground">Sin jugadores registrados</div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {filteredPlayers?.map((player, idx) => {
            const points = player.elo ?? 1500;

            return (
              <div key={player.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0", avatarColors[idx % avatarColors.length])}>
                  {initials(player.name)}
                </div>

                <Link href={`/jugadores/${player.id}`} className="flex-1 min-w-0 flex items-center justify-between group-hover:scale-[1.005] transition-transform">
                  <div>
                    <p className="font-semibold text-sm truncate">{player.name}</p>
                    {player.nickname && <p className="text-[11px] text-muted-foreground uppercase tracking-wide">&quot;{player.nickname}&quot;</p>}
                  </div>
                  <div className="text-right mr-2">
                    <span className="text-lg font-black text-primary tracking-tighter">{points}</span>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold -mt-1">Pts</p>
                  </div>
                </Link>

                <div className="flex items-center gap-1">
                  {player.phone && (
                    <button
                      onClick={() => openWhatsApp(player.phone!)}
                      title="Enviar WhatsApp"
                      className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                    >
                      <MessageCircle size={15} />
                    </button>
                  )}
                  <Link href={`/jugadores/${player.id}/editar`} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                    <Pencil size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
          {filteredPlayers?.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No se encontraron jugadores</div>
          )}
        </div>
      )}
    </div>
  );
}