import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Building2,
  Palette,
  MapPin,
  Share2,
  Check,
  Copy,
  Clock,
  Sparkles,
  Trophy,
  Save,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Camera,
  Upload,
  Trash2,
  ImageIcon,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";

const PRESET_COLORS = [
  { name: "Verde Pádel", hex: "#10b981", bgClass: "bg-[#10b981]" },
  { name: "Azul Pro", hex: "#2563eb", bgClass: "bg-[#2563eb]" },
  { name: "Naranja Arcilla", hex: "#f97316", bgClass: "bg-[#f97316]" },
  { name: "Púrpura Club", hex: "#8b5cf6", bgClass: "bg-[#8b5cf6]" },
  { name: "Rojo Competitivo", hex: "#ef4444", bgClass: "bg-[#ef4444]" },
  { name: "Teal Moderno", hex: "#0d9488", bgClass: "bg-[#0d9488]" },
];

export default function ConfiguracionClub() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [club, setClub] = useState<any>(null);
  const [clubName, setClubName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#10b981");
  const [city, setCity] = useState("Santiago");
  const [country, setCountry] = useState("Chile");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<string>("es");

  const loadClub = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clubs/current");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setClub(data);
          setClubName(data.name || "");
          setLogoUrl(data.logoUrl || "");
          setPrimaryColor(data.primaryColor || "#10b981");
          setCity(data.city || "Santiago");
          setCountry(data.country || "Chile");
          setAddress(data.address || "");
          setMapUrl(data.mapUrl || "");
          setDefaultLanguage(data.defaultLanguage || "es");
        }
      }
    } catch (e) {
      console.error("Error al cargar datos del club:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClub();
  }, []);

  const handleCopy = (text: string, isCode: boolean) => {
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    toast({
      title: "Copiado al portapapeles",
      description: "Listo para compartir con tus jugadores por WhatsApp.",
    });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo no válido",
        description: "Por favor selecciona un archivo de imagen (JPG, PNG o WebP).",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setLogoUrl(compressedDataUrl);
          toast({
            title: "Escudo o foto cargada",
            description: "Imagen lista. Haz clic en 'Guardar Cambios' para aplicarla.",
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club) return;

    try {
      setSaving(true);
      const res = await fetch("/api/club/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: club.id,
          name: clubName.trim(),
          logoUrl: logoUrl.trim(),
          primaryColor,
          city: city.trim(),
          country: country.trim(),
          address: address.trim(),
          mapUrl: mapUrl.trim(),
          defaultLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar la configuración.");
      }

      toast({
        title: "¡Configuración guardada!",
        description: "Los cambios se aplicaron exitosamente a tu club.",
      });

      // Recargar datos y notificar a la app
      await loadClub();
      window.dispatchEvent(new Event("club_updated"));
    } catch (err: any) {
      toast({
        title: "Error al guardar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-foreground/80 font-medium">Cargando configuración del club...</p>
      </div>
    );
  }

  const publicClubUrl = `${window.location.origin}/club/${club?.slug}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Panel</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Configuración de Mi Club
          </h1>
          <p className="text-xs sm:text-sm text-foreground/80 mt-0.5 font-medium">
            Personaliza el nombre, colores corporativos, logotipo y datos públicos de tu club.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 font-bold shadow-sm self-start sm:self-auto cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
        </Button>
      </div>

      {/* 1. Tarjeta de Estado & Periodo de Prueba */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                Plan Club Pro (Periodo de Prueba)
              </span>
              <span className="text-xs text-foreground/80 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                14 Días de Acceso Total
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground">{club?.name}</h3>
            <p className="text-xs text-foreground/80 font-medium">
              Tu club tiene activas todas las funciones Pro: asistente de WhatsApp, emparejamientos y alertas satelitales.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(club?.inviteCode || "", true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted border border-border text-xs font-semibold text-foreground transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>Código: {club?.inviteCode}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(publicClubUrl, false)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-xs font-bold text-primary transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>Copiar Link para WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 2. Identidad Visual y Colores */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-foreground font-bold text-base">
            <Palette className="w-5 h-5 text-primary" />
            <span>Identidad Visual y Colores de Marca</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre del Club */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Nombre del Club o Liga *</label>
              <Input
                type="text"
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Ej: Club Pádel Central"
                className="h-10 text-foreground font-medium"
              />
            </div>

            {/* Foto o Escudo del Club */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Escudo / Logotipo del Club</span>
                <span className="text-[11px] font-normal text-muted-foreground">JPG, PNG o WebP</span>
              </label>

              <div className="flex items-center gap-4 p-3 bg-muted/30 border border-border/80 rounded-xl">
                {/* Vista previa */}
                <div className="relative group shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={clubName || "Escudo"}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-primary/50 shadow-sm bg-background"
                      onError={() => {}}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center text-primary">
                      <Building2 className="w-7 h-7 opacity-70" />
                    </div>
                  )}
                  <label
                    className="absolute -bottom-1 -right-1 p-1 bg-primary text-primary-foreground rounded-full shadow cursor-pointer hover:opacity-90 transition-opacity"
                    title="Seleccionar foto"
                  >
                    <Camera size={12} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Acciones de subida */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary cursor-pointer transition-colors shadow-xs">
                      <Upload size={13} />
                      <span>Subir desde dispositivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-xs font-medium text-destructive transition-colors cursor-pointer"
                        title="Quitar escudo"
                      >
                        <Trash2 size={12} />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Sube el escudo desde tu teléfono o computador.
                  </p>
                </div>
              </div>

              {/* Opción de pegar URL directa */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <ImageIcon size={11} />
                  <span>O pega una URL de imagen:</span>
                </label>
                <Input
                  type="url"
                  value={logoUrl.startsWith("data:") ? "" : logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mifoto.png"
                  className="h-8 text-xs text-foreground font-medium"
                />
              </div>
            </div>
          </div>

          {/* Selector de Colores */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-foreground">Color Principal del Club</label>
            <div className="flex flex-wrap items-center gap-3">
              {PRESET_COLORS.map((col) => (
                <button
                  type="button"
                  key={col.hex}
                  onClick={() => setPrimaryColor(col.hex)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    primaryColor.toLowerCase() === col.hex.toLowerCase()
                      ? "border-foreground ring-2 ring-primary text-foreground shadow-sm bg-muted/60"
                      : "border-border text-foreground/80 hover:bg-muted/40"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${col.bgClass}`} />
                  <span>{col.name}</span>
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs font-medium text-foreground/80">Personalizado:</span>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Ubicación y Ciudad (Satelital) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-foreground font-bold text-base">
            <MapPin className="w-5 h-5 text-primary" />
            <span>Ubicación de las Canchas (Para Alertas Climáticas)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Ciudad / Comuna *</label>
              <Input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Santiago, Las Condes, Viña del Mar..."
                className="h-10 text-foreground font-medium"
              />
              <span className="text-[11px] text-foreground/80 block font-medium">
                Esta ciudad es la que consulta el radar meteorológico satelital.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">País</label>
              <Input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Chile"
                className="h-10 text-foreground font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Dirección Física de las Canchas</label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Las Condes 12345"
                className="h-10 text-foreground font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Enlace Google Maps / Waze</label>
              <Input
                type="url"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="h-10 text-foreground font-medium"
              />
            </div>
          </div>
        </div>

        {/* 4. Idioma Predeterminado del Club */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-foreground font-bold text-base">
            <Globe className="w-5 h-5 text-primary" />
            <span>Idioma Predeterminado del Club</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Define el idioma en que se mostrará la interfaz por defecto a nuevos miembros y visitantes públicos del club.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {[
              { code: "es", label: "Español", flag: "🇪🇸", sub: "Predeterminado en Latinoamérica y España" },
              { code: "en", label: "English", flag: "🇬🇧", sub: "Default for international members" },
              { code: "pt", label: "Português", flag: "🇧🇷", sub: "Padrão para Brasil e Portugal" },
            ].map((langOpt) => (
              <button
                type="button"
                key={langOpt.code}
                onClick={() => setDefaultLanguage(langOpt.code)}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  defaultLanguage === langOpt.code
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 w-full">
                  <span className="text-lg">{langOpt.flag}</span>
                  <span className="text-sm font-bold text-foreground">{langOpt.label}</span>
                  {defaultLanguage === langOpt.code && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground leading-tight">{langOpt.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Guardado Inferior */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 font-bold px-6 py-2.5 shadow-md cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Guardando..." : "Guardar Todos los Cambios"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
