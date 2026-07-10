import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Building2, Plus, ToggleLeft, ToggleRight, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sport {
  id: number;
  name: string;
  slug: string;
  active: boolean;
}

interface Club {
  id: number;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  createdAt: string;
  sports: Sport[];
}

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClub, setShowNewClub] = useState(false);
  const [newClub, setNewClub] = useState({ name: "", slug: "", plan: "basic", sports: [] as number[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.isAdmin) return;
    Promise.all([
      fetch("/api/admin/clubs").then((r) => r.json()),
      fetch("/api/admin/sports").then((r) => r.json()),
    ]).then(([clubsData, sportsData]) => {
      setClubs(clubsData);
      setAllSports(sportsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const toggleSport = async (clubId: number, sportId: number, currentActive: boolean) => {
    const res = await fetch(`/api/admin/clubs/${clubId}/sports`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sportId, active: !currentActive }),
    });
    if (res.ok) {
      setClubs((prev) => prev.map((c) =>
        c.id === clubId
          ? { ...c, sports: c.sports.map((s) => s.id === sportId ? { ...s, active: !currentActive } : s) }
          : c
      ));
    }
  };

  const toggleClubActive = async (clubId: number, currentActive: boolean) => {
    const res = await fetch(`/api/admin/clubs/${clubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !currentActive }),
    });
    if (res.ok) {
      setClubs((prev) => prev.map((c) => c.id === clubId ? { ...c, active: !currentActive } : c));
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newClub.name || !newClub.slug) { setError("Nombre y slug son requeridos"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClub),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setClubs((prev) => [...prev, created]);
      setShowNewClub(false);
      setNewClub({ name: "", slug: "", plan: "basic", sports: [] });
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al crear el club");
    }
  };

  if (isLoading || loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Cargando...</div>;
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Shield size={32} className="text-muted-foreground" />
        <p className="font-semibold">Acceso restringido</p>
        <p className="text-sm text-muted-foreground">Solo los super-administradores pueden acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clubs.length} club{clubs.length !== 1 ? "s" : ""} registrado{clubs.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowNewClub(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={15} /> Nuevo Club
        </button>
      </div>

      {/* Formulario nuevo club */}
      {showNewClub && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Crear nuevo club</h2>
          <form onSubmit={handleCreateClub} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <input
                  value={newClub.name}
                  onChange={(e) => setNewClub((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Club Los Pinos"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Slug (URL)</label>
                <input
                  value={newClub.slug}
                  onChange={(e) => setNewClub((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                  placeholder="club-los-pinos"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Plan</label>
              <select
                value={newClub.plan}
                onChange={(e) => setNewClub((p) => ({ ...p, plan: e.target.value }))}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="basic">Basic — 1 deporte</option>
                <option value="pro">Pro — todos los deportes</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Deportes incluidos</label>
              <div className="flex gap-2 flex-wrap">
                {allSports.map((sport) => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => setNewClub((p) => ({
                      ...p,
                      sports: p.sports.includes(sport.id)
                        ? p.sports.filter((id) => id !== sport.id)
                        : [...p.sports, sport.id],
                    }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      newClub.sports.includes(sport.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {sport.name}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? "Creando..." : "Crear club"}
              </button>
              <button type="button" onClick={() => { setShowNewClub(false); setError(""); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm hover:bg-muted/80">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de clubs */}
      <div className="space-y-3">
        {clubs.map((club) => (
          <div key={club.id} className={cn("bg-card border rounded-xl p-5 space-y-4", club.active ? "border-border" : "border-border opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{club.name}</p>
                <p className="text-xs text-muted-foreground">/{club.slug} · Plan {club.plan}</p>
                {(club as any).inviteCode && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Código:</span>
                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded tracking-widest">
                      {(club as any).inviteCode}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText((club as any).inviteCode)}
                      className="text-xs text-primary hover:underline"
                    >
                      Copiar
                    </button>
                  </div>
                )}
                </div>
              </div>
              <button
                onClick={() => toggleClubActive(club.id, club.active)}
                className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
                  club.active ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                )}
              >
                {club.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {club.active ? "Activo" : "Inactivo"}
              </button>
            </div>

            {/* Deportes del club */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Deportes habilitados</p>
              <div className="flex gap-2 flex-wrap">
                {allSports.map((sport) => {
                  const clubSport = club.sports.find((s) => s.id === sport.id);
                  const isActive = clubSport?.active ?? false;
                  return (
                    <button
                      key={sport.id}
                      onClick={() => toggleSport(club.id, sport.id, isActive)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {sport.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}