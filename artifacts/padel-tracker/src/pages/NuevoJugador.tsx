import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useCreatePlayer,
  getListPlayersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import {
  ArrowLeft,
  User,
  Phone,
  MessageSquare,
  Globe,
  Tag,
} from "lucide-react";
import { Link } from "wouter";

// Diccionario de traducciones para el formulario dinámico
const labels: Record<string, Record<string, string>> = {
  es: {
    title: "Nuevo Jugador",
    subtitle: "Registra un nuevo jugador",
    fullName: "Nombre completo",
    nickname: "Apodo",
    optional: "(opcional)",
    appLanguage: "Idioma de la aplicación",
    categoriesHeader: "Categorías / Deportes",
    contactHeader: "Contacto & Notificaciones",
    phone: "Teléfono",
    waId: "WhatsApp ID / Usuario",
    consent:
      "Autoriza el envío de notificantes y confirmación de partidos por WhatsApp.",
    submit: "Crear Jugador",
    creating: "Creando...",
    errorMsg: "Error al crear el jugador. Intenta de nuevo.",
    errorNameRequired: "El nombre es obligatorio.",
  },
  en: {
    title: "New Player",
    subtitle: "Register a new player",
    fullName: "Full Name",
    nickname: "Nickname",
    optional: "(optional)",
    appLanguage: "App Language",
    categoriesHeader: "Categories / Sports",
    contactHeader: "Contact & Notifications",
    phone: "Phone Number",
    waId: "WhatsApp ID / Username",
    consent:
      "Authorizes sending notifications and match confirmations via WhatsApp.",
    submit: "Create Player",
    creating: "Creating...",
    errorMsg: "Error creating player. Please try again.",
    errorNameRequired: "Name is required.",
  },
  pt: {
    title: "Novo Jogador",
    subtitle: "Cadastrar um novo jogador",
    fullName: "Nome completo",
    nickname: "Apelido",
    optional: "(opcional)",
    appLanguage: "Idioma do aplicativo",
    categoriesHeader: "Categorias / Esportes",
    contactHeader: "Contato & Notificações",
    phone: "Telefone",
    waId: "ID / Usuário do WhatsApp",
    consent:
      "Autoriza o envio de notificações e confirmação de jogos pelo WhatsApp.",
    submit: "Criar Jogador",
    creating: "Criando...",
    errorMsg: "Erro ao criar jogador. Tente novamente.",
    errorNameRequired: "O nome é obrigatório.",
  },
};

interface Category {
  id: number;
  name: string;
}

export default function NuevoJugador() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Datos básicos del jugador
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  // Idioma de la aplicación/usuario (por defecto Español)
  const [language, setLanguage] = useState("es");

  // Contacto y WhatsApp
  const [phone, setPhone] = useState("");
  const [waId, setWaId] = useState("");
  const [wspConsent, setWspConsent] = useState(false);

  // Categorías disponibles y seleccionadas (Multideporte)
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // El Super Admin opera globalmente; Club Admin siempre trabaja sobre su club.
  const isSuperAdmin = !!(
    user &&
    (user as any).isAdmin === 1 &&
    (user as any).isClubAdmin !== 1
  );

  // Textos traducidos dinámicamente según la opción elegida
  const t = labels[language] || labels.es;

  // Cargar categorías disponibles al montar el componente
  useEffect(() => {
    fetch("/api/club-sport-categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableCategories(data);
        }
      })
      .catch((err) => console.error("Error cargando categorías:", err));
  }, []);

  const createMutation = useCreatePlayer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        navigate("/jugadores");
      },
      onError: () => {
        setError(t.errorMsg);
      },
    },
  });

  const handleCategoryToggle = (catId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError(t.errorNameRequired);
      return;
    }

    createMutation.mutate({
      data: {
        name: name.trim(),
        ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
        language,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(waId.trim() ? { waId: waId.trim() } : {}),
        wspConsent,
        categoryIds: selectedCategoryIds,
      } as any,
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/jugadores"
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
            <User size={28} className="text-primary" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre completo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t.fullName} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carlos Lopez"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Apodo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t.nickname}{" "}
              <span className="text-muted-foreground text-xs">
                {t.optional}
              </span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej: El Rayo"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Selector de Categorías / Deportes */}
          {availableCategories.length > 0 && (
            <div className="space-y-2 pt-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Tag size={14} className="text-muted-foreground" />
                {t.categoriesHeader}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-background/50 border border-input rounded-lg p-2.5">
                {availableCategories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => handleCategoryToggle(cat.id)}
                      className={`text-xs px-2.5 py-2 rounded-md border text-left transition-colors font-medium truncate ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selector de Idioma Principal */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Globe size={14} className="text-muted-foreground" />
              {t.appLanguage}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="es">Español (ES)</option>
              <option value="en">English (EN)</option>
              <option value="pt">Português (PT)</option>
            </select>
          </div>

          <hr className="border-border/60 my-3" />

          {/* Contacto & WhatsApp */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.contactHeader}
            </p>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Phone size={14} className="text-muted-foreground" />
                {t.phone}{" "}
                <span className="text-muted-foreground text-xs">
                  {t.optional}
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +56912345678"
                className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            {/* WhatsApp ID / Handle */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <MessageSquare size={14} className="text-muted-foreground" />
                {t.waId}{" "}
                <span className="text-muted-foreground text-xs">
                  {t.optional}
                </span>
              </label>
              <input
                type="text"
                value={waId}
                onChange={(e) => setWaId(e.target.value)}
                placeholder="Ej: @carlos_padel"
                className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            {/* Consentimiento */}
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wspConsent}
                onChange={(e) => setWspConsent(e.target.checked)}
                className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                {t.consent}
              </span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {createMutation.isPending ? t.creating : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
