import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles,
  Building2,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CrearClub() {
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Form State
  const [clubName, setClubName] = useState("");
  const [city, setCity] = useState("Santiago");
  const [country, setCountry] = useState("Chile");

  const [sportId, setSportId] = useState<number>(1); // 1 = Pádel, 2 = Tenis, 3 = Fútbol
  const [totalCourts, setTotalCourts] = useState("3");
  const [coveredCourts, setCoveredCourts] = useState("1");

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clubName.trim()) {
      setError("Por favor ingresa el nombre de tu club o liga.");
      setStep(1);
      return;
    }

    if (!adminName.trim() || !adminEmail.trim()) {
      setError("Por favor completa tu nombre y correo electrónico.");
      setStep(3);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/clubs/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubName: clubName.trim(),
          city: city.trim() || "Santiago",
          country: country.trim() || "Chile",
          sportId,
          totalCourts: Number(totalCourts) || 3,
          coveredCourts: Number(coveredCourts) || 1,
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          adminPhone: adminPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el club.");
      }

      setSuccessData(data);
      // Guardar en sesión local para ingresar directo
      try {
        localStorage.setItem("padel_auth_user", JSON.stringify(data.user));
        localStorage.setItem("selected_club_id", String(data.club.id));
        localStorage.setItem("selected_sport_id", String(sportId));
      } catch {}
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error inesperado al registrar el club.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between pb-6 border-b border-border/50">
        <Link href="/landing" className="flex items-center gap-2 text-foreground font-black text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            P
          </div>
          <span>Parryn Sport Hub</span>
        </Link>
        <Link href="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          ¿Ya tienes cuenta? Iniciar Sesión
        </Link>
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto w-full my-auto py-8">
        {successData ? (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-lg animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                ¡Felicitaciones!
              </span>
              <h2 className="text-2xl font-bold text-foreground">
                Tu club "{successData.club.name}" ya está activo
              </h2>
              <p className="text-sm text-muted-foreground">
                Se han activado tus <strong>14 días de prueba gratuita</strong> con acceso a todas las herramientas Pro.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Código de Invitación para Jugadores:</span>
                <span className="font-mono font-bold text-foreground text-sm bg-background px-2 py-0.5 rounded border border-border">
                  {successData.inviteCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Enlace público de tu club:</span>
                <span className="font-mono text-primary font-semibold">
                  /club/{successData.slug}
                </span>
              </div>
            </div>

            <Button
              onClick={() => {
                window.location.href = "/";
              }}
              className="w-full font-bold py-3 text-sm gap-2"
            >
              <span>Ingresar al Panel de mi Club</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-md">
            {/* Steps Progress Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Paso {step} de 3</span>
                <span>
                  {step === 1 && "Datos del Club"}
                  {step === 2 && "Deporte y Canchas"}
                  {step === 3 && "Cuenta Administrador"}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PASO 1: Datos del Club */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">¿Cómo se llama tu club o liga?</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ingresa el nombre público con el que tus jugadores te identificarán.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Nombre del Club / Liga *
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Ej: Pádel Club Los Andes, Liga San Martín F7..."
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Ciudad / Comuna *</label>
                      <Input
                        type="text"
                        required
                        placeholder="Ej: Santiago, Las Condes..."
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">País</label>
                      <Input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      disabled={!clubName.trim()}
                      onClick={() => setStep(2)}
                      className="w-full font-bold h-11 gap-2"
                    >
                      <span>Siguiente: Deporte y Canchas</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 2: Deporte y Canchas */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Selecciona el Deporte Principal</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Podrás habilitar otros deportes en cualquier momento desde la configuración.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 1, name: "Pádel", icon: "🎾", desc: "Americanas & Elo" },
                      { id: 3, name: "Fútbol", icon: "⚽", desc: "Pichangas & Liga" },
                      { id: 2, name: "Tenis", icon: "🎾", desc: "Singles & Dobles" },
                    ].map((sp) => (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => setSportId(sp.id)}
                        className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          sportId === sp.id
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-2xl">{sp.icon}</span>
                        <span className="font-bold text-xs text-foreground">{sp.name}</span>
                        <span className="text-[10px] text-muted-foreground">{sp.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Total de Canchas / Pistas</label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={totalCourts}
                        onChange={(e) => setTotalCourts(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Canchas Techadas (si aplica)</label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={coveredCourts}
                        onChange={(e) => setCoveredCourts(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="w-1/3 h-11 gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Atrás</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      className="w-2/3 font-bold h-11 gap-2"
                    >
                      <span>Siguiente: Tu Cuenta</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 3: Cuenta Administrador */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Tus Datos de Administrador</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Esta cuenta tendrá permisos totales para gestionar las canchas, jugadores y cobros.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Nombre y Apellido *</label>
                    <Input
                      type="text"
                      required
                      placeholder="Ej: Mauricio Bau"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Correo Electrónico *</label>
                    <Input
                      type="email"
                      required
                      placeholder="tu@email.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Teléfono / WhatsApp (Opcional)</label>
                    <Input
                      type="tel"
                      placeholder="+56 9 1234 5678"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-[11px] text-muted-foreground space-y-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Prueba Gratuita de 14 Días Activada
                    </span>
                    <p>No se te cobrará nada. Tendrás acceso instantáneo a todas las herramientas Pro.</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="w-1/3 h-11 gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Atrás</span>
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !adminName.trim() || !adminEmail.trim()}
                      className="w-2/3 font-bold h-11 gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creando club...</span>
                        </>
                      ) : (
                        <>
                          <span>Activar Club Gratis</span>
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-xl mx-auto w-full text-center text-xs text-muted-foreground pt-6 border-t border-border/40">
        Parryn Sport Hub IA — Plataforma Deportiva Oficial
      </div>
    </div>
  );
}
