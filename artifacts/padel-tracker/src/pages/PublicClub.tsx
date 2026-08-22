import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { MapPin, MessageSquare, Trophy, Users, LogIn, UserPlus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@workspace/replit-auth-web";

interface PublicClubData {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  inviteCode?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  sports: { id: number; name: string; slug: string; active: boolean }[];
  adminName?: string | null;
  adminEmail?: string | null;
  adminPhone?: string | null;
  adminWhatsappAlias?: string | null;
}

function hexToHsl(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function PublicClub() {
  const [, params] = useRoute("/:slug");
  const { user } = useAuth();
  const [club, setClub] = useState<PublicClubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const slug = params?.slug;
    if (!slug) return;

    setLoading(true);
    fetch(`/api/clubs/public/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Club no encontrado");
        return res.json();
      })
      .then((data) => setClub(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params?.slug]);

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Cargando club...</div>;
  }

  if (error || !club) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold">Club no encontrado</h1>
        <p className="mt-2 text-muted-foreground">El enlace público no existe o el club está inactivo.</p>
      </div>
    );
  }

  const locationParts = [club.address, club.city, club.state, club.country].filter(Boolean);
  const publicMapUrl = club.mapUrl || (locationParts.length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationParts.join(", "))}` : null);
  const publicUrl = typeof window !== "undefined" ? window.location.href : "";
  const activeSports = club.sports.filter((sport) => sport.active !== false);
  const cssVars = {
    ...(club.primaryColor ? { "--primary": hexToHsl(club.primaryColor) } : {}),
    ...(club.secondaryColor ? { "--secondary": hexToHsl(club.secondaryColor) } : {}),
  } as React.CSSProperties;

  const copyInviteCode = async () => {
    if (!club.inviteCode) return;
    await navigator.clipboard.writeText(club.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" style={cssVars}>
      <div className="flex items-center justify-end">
        <AuthButton />
      </div>

      <section className="relative overflow-hidden rounded-3xl border bg-card p-8 md:p-12 shadow-sm">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl border-2 border-primary/20 bg-background flex items-center justify-center overflow-hidden shadow-lg">
            {club.logoUrl ? (
              <img src={club.logoUrl} alt={`Logo ${club.name}`} className="w-full h-full object-cover" />
            ) : (
              <Trophy className="text-primary" size={48} />
            )}
          </div>
          <h1 className="mt-6 text-3xl md:text-5xl font-bold tracking-tight">{club.name}</h1>
          <p className="mt-2 text-muted-foreground">Comunidad deportiva en Padel Tracker IA</p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {activeSports.map((sport) => (
              <span key={sport.id} className="rounded-full border bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                {sport.name}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!user && <Button onClick={() => window.location.assign("/onboarding")} className="gap-2"><UserPlus size={16} /> Registrarme</Button>}
            {user && <Button onClick={() => window.location.assign("/")} className="gap-2"><LogIn size={16} /> Entrar al club</Button>}
            {publicMapUrl && <Button asChild variant="outline" className="gap-2"><a href={publicMapUrl} target="_blank" rel="noreferrer"><MapPin size={16} /> Ver ubicación</a></Button>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="text-primary" size={20} />
            <h2 className="font-bold text-lg">Únete al club</h2>
          </div>
          <p className="text-sm text-muted-foreground">Si ya recibiste el código de invitación del administrador, úsalo para vincularte al club.</p>
          {club.inviteCode ? (
            <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3">
              <span className="flex-1 font-mono text-lg font-bold tracking-wider">{club.inviteCode}</span>
              <Button variant="outline" size="sm" onClick={copyInviteCode} className="gap-1.5">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">El administrador aún no ha configurado un código.</p>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="text-primary" size={20} />
            <h2 className="font-bold text-lg">Ubicación</h2>
          </div>
          {locationParts.length ? <p className="text-sm text-muted-foreground">{locationParts.join(", ")}</p> : <p className="text-sm italic text-muted-foreground">Ubicación no informada.</p>}
          {publicMapUrl && <Button asChild variant="outline" className="gap-2"><a href={publicMapUrl} target="_blank" rel="noreferrer"><MapPin size={16} /> Abrir mapa</a></Button>}
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary" size={20} />
          <h2 className="font-bold text-lg">Contacto del administrador</h2>
        </div>
        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          {club.adminName && <p className="font-semibold text-foreground">{club.adminName}</p>}
          {club.adminEmail && <p>{club.adminEmail}</p>}
          {club.adminPhone && <p>{club.adminPhone}</p>}
          {club.adminWhatsappAlias && <p>WhatsApp: @{club.adminWhatsappAlias.replace(/^@/, "")}</p>}
          {!club.adminName && !club.adminEmail && !club.adminPhone && !club.adminWhatsappAlias && <p className="italic">El administrador aún no ha publicado datos de contacto.</p>}
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">{publicUrl}</p>
    </div>
  );
}
