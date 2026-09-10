import { useState, useEffect, useRef } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLanguage } from "../context/LanguageContext";
import CategoriesManager from "@/components/CategoriesManager";
import { 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Shield, 
  MapPin, 
  Pencil, 
  X, 
  Save, 
  Globe, 
  Check, 
  Copy,
  Upload,
  Image as ImageIcon,
  Trash2,
  UserPlus,
  Users,
  Mail,
  MessageSquare,
  Map as MapIcon,
  ExternalLink,
  AtSign
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Sport {
  id: number;
  name: string;
  slug: string;
  active?: boolean;
}

interface AdminUser {
  id: number;
  name: string;
  nickname?: string;
  email: string;
  phone?: string;
}

interface Club {
  id: number;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  createdAt: string;
  sports: Sport[];
  inviteCode?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  mapUrl?: string | null;
  adminName?: string;
  adminNickname?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminWhatsappAlias?: string;
  contactPreference?: "whatsapp" | "email" | "both";
  defaultLanguage?: string;
  admin_name?: string;
  admin_email?: string;
  admin_phone?: string;
}

const DEFAULT_SPORTS: Sport[] = [
  { id: 1, name: "Pádel", slug: "padel" },
  { id: 2, name: "Tenis", slug: "tenis" },
  { id: 3, name: "Fútbol", slug: "futbol" },
];

const LANGUAGE_FLAGS: Record<string, { label: string; flag: string }> = {
  es: { label: "Español", flag: "🇪🇸" },
  en: { label: "English", flag: "🇺🇸" },
  pt: { label: "Português", flag: "🇧🇷" }
};

const COUNTRY_LOCATIONS: Record<string, Record<string, string[]>> = {
  "Chile": {
    "Región Metropolitana": ["Santiago", "Puente Alto", "Las Condes", "Maipú", "Providencia", "Ñuñoa", "La Florida", "San Bernardo", "Vitacura", "Lo Barnechea"],
    "Valparaíso": ["Valparaíso", "Viña del Mar", "Concón", "Quilpué", "Villa Alemana", "San Antonio"],
    "Biobío": ["Concepción", "Talcahuano", "Chillán", "Los Ángeles", "San Pedro de La Paz"],
    "Antofagasta": ["Antofagasta", "Calama", "Tocopilla"],
    "Coquimbo": ["La Serena", "Coquimbo", "Ovalle"],
    "Araucanía": ["Temuco", "Villarrica", "Pucón"],
    "O'Higgins": ["Rancagua", "San Fernando", "Pichilemu"],
    "Maule": ["Talca", "Curicó", "Linares"],
    "Los Lagos": ["Puerto Montt", "Osorno", "Valdivia", "Castro"]
  },
  "Argentina": {
    "Buenos Aires": ["La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "Quilmes", "San Isidro"],
    "Capital Federal (CABA)": ["Palermo", "Recoleta", "Belgrano", "Caballito", "Puerto Madero"],
    "Córdoba": ["Córdoba Capital", "Villa Carlos Paz", "Río Cuarto", "Alta Gracia"],
    "Santa Fe": ["Rosario", "Santa Fe Capital", "Rafaela", "Venado Tuerto"],
    "Mendoza": ["Mendoza Capital", "Godoy Cruz", "San Rafael", "Luján de Cuyo"]
  },
  "España": {
    "Comunidad de Madrid": ["Madrid", "Alcobendas", "Pozuelo de Alarcón", "Móstoles", "Alcalá de Henares"],
    "Cataluña": ["Barcelona", "Hospitalet de Llobregat", "Badalona", "Terrassa", "Girona"],
    "Andalucía": ["Sevilla", "Málaga", "Granada", "Córdoba", "Marbella"],
    "Comunidad Valenciana": ["Valencia", "Alicante", "Castellón de la Plana", "Elche"]
  },
  "México": {
    "Ciudad de México": ["Polanco", "Condesa", "Coyoacán", "Santa Fe", "Cuauhtémoc"],
    "Jalisco": ["Guadalajara", "Zapopan", "Puerto Vallarta", "Tlaquepaque"],
    "Nuevo León": ["Monterrey", "San Pedro Garza García", "San Nicolás", "Apodaca"],
    "Estado de México": ["Toluca", "Naucalpan", "Huixquilucan", "Metepec"]
  },
  "Colombia": {
    "Bogotá D.C.": ["Usaquén", "Chapinero", "Suba", "Teusaquillo"],
    "Antioquia": ["Medellín", "Envigado", "Poblado", "Rionegro"],
    "Valle del Cauca": ["Cali", "Palmira", "Tuluá"],
    "Atlántico": ["Barranquilla", "Soledad", "Puerto Colombia"]
  },
  "Perú": {
    "Lima": ["Miraflores", "San Isidro", "Surco", "La Molina", "Barranco"],
    "Arequipa": ["Arequipa Central", "Yanahuara", "Cayma"],
    "Cusco": ["Cusco Central", "Wanchaq", "San Sebastián"]
  },
  "Uruguay": {
    "Montevideo": ["Pocitos", "Carrasco", "Punta Carretas", "Centro"],
    "Maldonado": ["Punta del Este", "Maldonado Centro", "San Carlos"],
    "Canelones": ["Ciudad de la Costa", "Las Piedras"]
  }
};

function getEffectiveMapUrl(location: { mapUrl?: string | null; address?: string | null; state?: string | null; city?: string | null; country?: string | null }) {
  if (location.mapUrl && location.mapUrl.trim() !== "") {
    return location.mapUrl;
  }
  const parts = [location.address, location.city, location.state, location.country].filter(Boolean);
  if (parts.length > 0) {
    const query = encodeURIComponent(parts.join(", "));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  return null;
}

export default function Admin() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const isAdmin = !!(user && (user as any).isAdmin && (user as any).isAdmin > 0);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>(DEFAULT_SPORTS);
  const [existingAdmins, setExistingAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClub, setShowNewClub] = useState(false);
  const [saving, setSaving] = useState(false);

  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  const newFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(`${window.location.host}/`);
    }
  }, []);

  const [adminMode, setAdminMode] = useState<"new" | "existing">("new");

  const [newClub, setNewClub] = useState({ 
    name: "", 
    slug: "", 
    plan: "pro", 
    defaultLanguage: "es",
    sports: [1, 2, 3] as number[], 
    logoUrl: "", 
    primaryColor: "#4f46e5", 
    secondaryColor: "#06b6d4", 
    country: "Chile",
    state: "Región Metropolitana",
    city: "Santiago",
    address: "",
    mapUrl: "",
    selectedAdminId: "" as string | number,
    adminName: "",
    adminNickname: "",
    adminEmail: "",
    adminPhone: "",
    adminWhatsappAlias: "",
    contactPreference: "whatsapp" as "whatsapp" | "email" | "both"
  });

  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    plan: "basic", 
    defaultLanguage: "es",
    country: "Chile",
    state: "Región Metropolitana",
    city: "Santiago",
    address: "", 
    mapUrl: "",
    logoUrl: "", 
    primaryColor: "#4f46e5", 
    secondaryColor: "#06b6d4",
    adminName: "",
    adminNickname: "",
    adminEmail: "",
    adminPhone: "",
    adminWhatsappAlias: "",
    contactPreference: "whatsapp" as "whatsapp" | "email" | "both",
    sports: [] as { id: number; active: boolean }[]
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        try {
          const clubsRes = await fetch("/api/admin/clubs");
          if (clubsRes.ok) {
            const clubsData = await clubsRes.json();
            const finalClubs = Array.isArray(clubsData) ? clubsData : (clubsData.clubs || []);
            setClubs(finalClubs);
          }
        } catch (e) {
          console.error("Error al obtener clubes:", e);
        }

        try {
          const sportsRes = await fetch("/api/admin/sports");
          if (sportsRes.ok) {
            const sportsData = await sportsRes.json();
            const sportsMap = new Map<string, Sport>();
            DEFAULT_SPORTS.forEach(s => sportsMap.set(s.slug, s));

            if (Array.isArray(sportsData)) {
              sportsData.forEach((s: any) => {
                if (!s) return;
                const rawSlug = s.slug || s.name || "";
                const normSlug = String(rawSlug)
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9]+/g, "-");

                if (normSlug && normSlug !== "multi-deporte") {
                  const existing = sportsMap.get(normSlug);
                  sportsMap.set(normSlug, {
                    id: s.id || existing?.id || 1,
                    name: existing?.name || s.name || "",
                    slug: normSlug,
                    active: s.active
                  });
                }
              });
            }
            setAllSports(Array.from(sportsMap.values()).filter(s => s.slug !== "multi-deporte"));
          }
        } catch (e) {
          console.error("Error al obtener deportes:", e);
        }

        try {
          const adminsRes = await fetch("/api/admin/users?role=admin");
          if (adminsRes.ok) {
            const adminsData = await adminsRes.json();
            if (Array.isArray(adminsData)) setExistingAdmins(adminsData);
          }
        } catch (e) {
          console.error("Error al obtener administradores:", e);
        }

      } catch (err) {
        console.error("Error cargando panel de administración:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, isAdmin]);

  const availableSportsList = allSports.length > 0 ? allSports : DEFAULT_SPORTS;

  const handleCountryChange = (country: string, isEdit = false) => {
    const countryData = COUNTRY_LOCATIONS[country];
    const defaultState = countryData ? Object.keys(countryData)[0] : "";
    const defaultCity = (countryData && defaultState) ? countryData[defaultState][0] : "";

    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        country,
        state: defaultState,
        city: defaultCity
      }));
    } else {
      setNewClub(prev => ({
        ...prev,
        country,
        state: defaultState,
        city: defaultCity
      }));
    }
  };

  const handleStateChange = (state: string, country: string, isEdit = false) => {
    const countryData = COUNTRY_LOCATIONS[country];
    const defaultCity = countryData?.[state]?.[0] || "";

    if (isEdit) {
      setEditForm(prev => ({ ...prev, state, city: defaultCity }));
    } else {
      setNewClub(prev => ({ ...prev, state, city: defaultCity }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, onSelect: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
          onSelect(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleNameChange = (val: string) => {
    const generatedSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    setNewClub(prev => ({
      ...prev,
      name: val,
      slug: generatedSlug
    }));
  };

  const handleSelectExistingAdmin = (adminIdStr: string) => {
    const adminId = Number(adminIdStr);
    const selected = existingAdmins.find(a => a.id === adminId);
    if (selected) {
      setNewClub(prev => ({
        ...prev,
        selectedAdminId: adminId,
        adminName: selected.name,
        adminNickname: selected.nickname || "",
        adminEmail: selected.email,
        adminPhone: selected.phone || ""
      }));
    } else {
      setNewClub(prev => ({ ...prev, selectedAdminId: "" }));
    }
  };

  const toggleSportInNewClub = (sportId: number) => {
    setNewClub(prev => {
      const exists = prev.sports.includes(sportId);
      return {
        ...prev,
        sports: exists 
          ? prev.sports.filter(id => id !== sportId) 
          : [...prev.sports, sportId]
      };
    });
  };

  const toggleSport = async (clubId: number, sportId: number, currentActive: boolean) => {
    const nextActiveState = !currentActive;

    const res = await fetch(`/api/admin/clubs/${clubId}/sports`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sportId, active: nextActiveState }),
    });

    if (res.ok) {
      setClubs(prev => prev.map(c => {
        if (c.id !== clubId) return c;

        const existingSports = c.sports || [];
        const sportExists = existingSports.some(s => s.id === sportId);

        let updatedSports: Sport[];
        if (sportExists) {
          updatedSports = existingSports.map(s => s.id === sportId ? { ...s, active: nextActiveState } : s);
        } else {
          const sportObj = availableSportsList.find(s => s.id === sportId);
          updatedSports = [...existingSports, { id: sportObj?.id || sportId, name: sportObj?.name || "", slug: sportObj?.slug || "", active: nextActiveState }];
        }

        return { ...c, sports: updatedSports };
      }));
    }
  };

  const toggleClubActive = async (clubId: number, currentActive: boolean) => {
    const res = await fetch(`/api/admin/clubs/${clubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !currentActive }),
    });
    if (res.ok) {
      setClubs(prev => prev.map(c => c.id === clubId ? { ...c, active: !currentActive } : c));
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const computedMapUrl = getEffectiveMapUrl(newClub) || "";

      const payload = {
        ...newClub,
        mapUrl: newClub.mapUrl.trim() ? newClub.mapUrl : computedMapUrl,
        adminMode
      };

      const res = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const detailMsg = errorData.message || errorData.error || errorData.details || `Código HTTP ${res.status}`;
        throw new Error(`Error en el servidor: ${detailMsg}`);
      }

      const data = await res.json();
      const createdClub: Club = data.club || data;

      if (!createdClub.sports || createdClub.sports.length === 0) {
        createdClub.sports = availableSportsList.filter(s => newClub.sports.includes(s.id)).map(s => ({ ...s, active: true }));
      }

      setClubs(prev => [createdClub, ...prev]);
      setShowNewClub(false);

      setNewClub({ 
        name: "", 
        slug: "", 
        plan: "pro", 
        defaultLanguage: "es",
        sports: [1, 2, 3], 
        logoUrl: "", 
        primaryColor: "#4f46e5", 
        secondaryColor: "#06b6d4", 
        country: "Chile",
        state: "Región Metropolitana",
        city: "Santiago",
        address: "",
        mapUrl: "",
        selectedAdminId: "",
        adminName: "",
        adminNickname: "",
        adminEmail: "",
        adminPhone: "",
        adminWhatsappAlias: "",
        contactPreference: "whatsapp"
      });

    } catch (err: any) {
      console.error("Error al crear el club:", err);
      alert(err.message || "Ocurrió un problema al guardar el club.");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (club: Club) => {
    setEditingClub(club);
    setEditForm({ 
      name: club.name, 
      plan: club.plan || "basic", 
      defaultLanguage: club.defaultLanguage || "es",
      country: club.country || "Chile",
      state: club.state || "Región Metropolitana",
      city: club.city || "Santiago",
      address: club.address || "", 
      mapUrl: club.mapUrl || "",
      logoUrl: club.logoUrl || "", 
      primaryColor: club.primaryColor || "#4f46e5", 
      secondaryColor: club.secondaryColor || "#06b6d4",
      adminName: club.adminName || club.admin_name || "",
      adminNickname: club.adminNickname || "",
      adminEmail: club.adminEmail || club.admin_email || "",
      adminPhone: club.adminPhone || club.admin_phone || "",
      adminWhatsappAlias: club.adminWhatsappAlias || "",
      contactPreference: club.contactPreference || "whatsapp",
      sports: availableSportsList.map(s => {
        const found = (club.sports || []).find(cs => cs.id === s.id || cs.slug === s.slug);
        return {
          id: s.id,
          active: found ? (found.active !== false) : false
        };
      })
    });
  };

  const handleUpdateClub = async () => {
    if (!editingClub) return;
    setSaving(true);

    try {
      const computedMapUrl = getEffectiveMapUrl(editForm) || "";

      const payload = {
        ...editForm,
        mapUrl: editForm.mapUrl.trim() ? editForm.mapUrl : computedMapUrl
      };

      const res = await fetch(`/api/admin/clubs/${editingClub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const detailMsg = errorData.message || errorData.error || `Código HTTP ${res.status}`;
        throw new Error(`No se pudo actualizar: ${detailMsg}`);
      }

      const data = await res.json();
      const updatedData = data.club || data;

      for (const sportState of editForm.sports) {
        await fetch(`/api/admin/clubs/${editingClub.id}/sports`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sportId: sportState.id, active: sportState.active }),
        }).catch(() => {});
      }

      const refreshedSports = availableSportsList.map(s => {
        const match = editForm.sports.find(es => es.id === s.id);
        return { ...s, active: match ? match.active : false };
      });

      setClubs(prev => prev.map(c => c.id === editingClub.id ? { ...c, ...editForm, sports: refreshedSports, ...updatedData } : c));
      setEditingClub(null);

    } catch (err: any) {
      console.error("Error actualizando el club:", err);
      alert(err.message || "Error al actualizar los datos del club.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = (text: string, clubId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkId(clubId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const copyCode = (text: string, clubId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(clubId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  if (isLoading || loading) return <div className="p-10 text-center text-muted-foreground">Cargando panel de gestión...</div>;
  if (!isAdmin) return <div className="text-center py-20 text-muted-foreground"><Shield size={48} className="mx-auto mb-4" /> Acceso restringido</div>;

  const newClubGeneratedMapUrl = getEffectiveMapUrl(newClub);
  const editClubGeneratedMapUrl = getEffectiveMapUrl(editForm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("adminTitle")}</h1>
          <p className="text-sm text-muted-foreground">{clubs.length} {t("clubsRegistered")}</p>
        </div>
        <button 
          onClick={() => setShowNewClub(!showNewClub)} 
          className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <Plus size={16} /> {t("newClub")}
        </button>
      </div>

      {showNewClub && (
        <form onSubmit={handleCreateClub} className="bg-card border p-6 rounded-xl space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-lg">{t("newClub")}</h2>
            <button type="button" onClick={() => setShowNewClub(false)} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">🏢 Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Club</label>
                <input 
                  placeholder="Ej. Club Deportivo Central" 
                  className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" 
                  value={newClub.name} 
                  onChange={e => handleNameChange(e.target.value)} 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Enlace Web del Club</label>
                <div className="flex items-center border rounded overflow-hidden bg-background focus-within:ring-1 focus-within:ring-primary">
                  <span className="px-2.5 py-2 text-xs text-muted-foreground bg-muted border-r font-mono select-none flex items-center gap-1 shrink-0 max-w-[180px] sm:max-w-[240px]">
                    <Globe size={13} className="shrink-0" />
                    <span className="truncate">{baseUrl || "app/"}</span>
                  </span>
                  <input 
                    placeholder="club-deportivo-central" 
                    className="w-full min-w-[120px] p-2 text-sm bg-transparent font-mono focus:outline-none" 
                    value={newClub.slug} 
                    onChange={e => setNewClub({...newClub, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "")})} 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Plan contratado</label>
                <select 
                  value={newClub.plan} 
                  onChange={e => setNewClub({...newClub, plan: e.target.value})}
                  className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="basic">Plan Basic</option>
                  <option value="pro">Plan Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">🌐 Idioma Predeterminado</label>
                <select 
                  value={newClub.defaultLanguage} 
                  onChange={e => setNewClub({...newClub, defaultLanguage: e.target.value})}
                  className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="es">Español 🇪🇸</option>
                  <option value="en">English 🇺🇸</option>
                  <option value="pt">Português 🇧🇷</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 border p-3.5 rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" /> Ubicación (País / Estado / Ciudad)
                </h4>

                {newClubGeneratedMapUrl && (
                  <a 
                    href={newClubGeneratedMapUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
                  >
                    <MapIcon size={13} /> Probar PIN en Mapa <ExternalLink size={11} />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">País</label>
                  <select 
                    value={newClub.country} 
                    onChange={e => handleCountryChange(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.keys(COUNTRY_LOCATIONS).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Región / Estado / Provincia</label>
                  {COUNTRY_LOCATIONS[newClub.country] ? (
                    <select 
                      value={newClub.state} 
                      onChange={e => handleStateChange(e.target.value, newClub.country)}
                      className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Object.keys(COUNTRY_LOCATIONS[newClub.country]).map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      placeholder="Ej. Provincia" 
                      className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={newClub.state} 
                      onChange={e => setNewClub({...newClub, state: e.target.value})} 
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Comuna / Ciudad</label>
                  {COUNTRY_LOCATIONS[newClub.country]?.[newClub.state] ? (
                    <select 
                      value={newClub.city} 
                      onChange={e => setNewClub({...newClub, city: e.target.value})}
                      className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {COUNTRY_LOCATIONS[newClub.country][newClub.state].map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      placeholder="Ej. Ciudad" 
                      className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={newClub.city} 
                      onChange={e => setNewClub({...newClub, city: e.target.value})} 
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Calle y Número (Dirección)</label>
                  <input 
                    placeholder="Ej. Av. Principal 1234" 
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" 
                    value={newClub.address} 
                    onChange={e => setNewClub({...newClub, address: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Enlace Personalizado Mapa (Opcional)</label>
                  <input 
                    placeholder="Ej. Waze, PIN específico o dejar en blanco" 
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs" 
                    value={newClub.mapUrl} 
                    onChange={e => setNewClub({...newClub, mapUrl: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="border p-4 rounded-xl bg-muted/20 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Logo del Club (Protagonista)</label>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl border-2 border-primary/30 bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                  {newClub.logoUrl ? (
                    <img src={newClub.logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-muted-foreground/40" size={32} />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={newFileInputRef} 
                      onChange={e => handleFileUpload(e, url => setNewClub({...newClub, logoUrl: url}))} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button 
                      type="button" 
                      onClick={() => newFileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Upload size={14} /> Cargar Imagen
                    </button>

                    {newClub.logoUrl && (
                      <button 
                        type="button" 
                        onClick={() => setNewClub({...newClub, logoUrl: ""})}
                        className="p-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Quitar logo"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <input 
                    placeholder="O pega el enlace de la imagen..." 
                    className="w-full p-2 border rounded-lg text-xs bg-background focus:outline-none font-mono" 
                    value={newClub.logoUrl} 
                    onChange={e => setNewClub({...newClub, logoUrl: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t("sportsEnabled")}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {availableSportsList.map(sport => {
                  const isSelected = newClub.sports.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSportInNewClub(sport.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer",
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-background text-muted-foreground border-input hover:bg-muted"
                      )}
                    >
                      {sport.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Colores distintivos del Club</label>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={newClub.primaryColor} 
                    onChange={e => setNewClub({...newClub, primaryColor: e.target.value})}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs text-muted-foreground">Primario</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={newClub.secondaryColor} 
                    onChange={e => setNewClub({...newClub, secondaryColor: e.target.value})}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs text-muted-foreground">Secundario</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">👤 {t("adminContact")}</h3>

              <div className="flex bg-muted p-0.5 rounded-lg border text-xs">
                <button
                  type="button"
                  onClick={() => setAdminMode("new")}
                  className={cn(
                    "px-3 py-1 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer",
                    adminMode === "new" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <UserPlus size={13} /> Crear Nuevo
                </button>
                <button
                  type="button"
                  onClick={() => setAdminMode("existing")}
                  className={cn(
                    "px-3 py-1 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer",
                    adminMode === "existing" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users size={13} /> Usar Existente
                </button>
              </div>
            </div>

            {adminMode === "existing" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Seleccionar Administrador Existente</label>
                  <select
                    value={newClub.selectedAdminId}
                    onChange={e => handleSelectExistingAdmin(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Seleccione un admin --</option>
                    {existingAdmins.map(admin => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Administrador</label>
                  <input
                    placeholder="Ej. Juan Pérez"
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newClub.adminName}
                    onChange={e => setNewClub({...newClub, adminName: e.target.value})}
                    required={adminMode === "new"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Apodo / Nickname (Opcional)</label>
                  <input
                    placeholder="Ej. JuanP"
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newClub.adminNickname}
                    onChange={e => setNewClub({...newClub, adminNickname: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="admin@club.com"
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newClub.adminEmail}
                    onChange={e => setNewClub({...newClub, adminEmail: e.target.value})}
                    required={adminMode === "new"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono / WhatsApp</label>
                  <input
                    placeholder="+56912345678"
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                    value={newClub.adminPhone}
                    onChange={e => setNewClub({...newClub, adminPhone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Alias WhatsApp (Opcional)</label>
                  <input
                    placeholder="juanperez"
                    className="w-full p-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                    value={newClub.adminWhatsappAlias}
                    onChange={e => setNewClub({...newClub, adminWhatsappAlias: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Preferencia de Contacto</label>
                  <div className="flex bg-muted p-1 rounded-lg border text-xs h-9">
                    <button
                      type="button"
                      onClick={() => setNewClub({...newClub, contactPreference: "whatsapp"})}
                      className={cn(
                        "flex-1 px-2 py-1 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer",
                        newClub.contactPreference === "whatsapp" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MessageSquare size={13} /> WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewClub({...newClub, contactPreference: "email"})}
                      className={cn(
                        "flex-1 px-2 py-1 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer",
                        newClub.contactPreference === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Mail size={13} /> Correo
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewClub({...newClub, contactPreference: "both"})}
                      className={cn(
                        "flex-1 px-2 py-1 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer",
                        newClub.contactPreference === "both" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <AtSign size={13} /> Ambos
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewClub(false)}
              className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <span className="animate-spin">⏳</span> : <Save size={16} />} Guardar Club
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {clubs.map(club => {
          const clubLink = `/${club.slug}`;
          const langInfo = LANGUAGE_FLAGS[club.defaultLanguage || "es"] || LANGUAGE_FLAGS.es;

          const hasAdminInfo = !!(
            club.adminName || 
            club.admin_name || 
            club.adminEmail || 
            club.admin_email || 
            club.adminPhone || 
            club.admin_phone
          );

          return (
            <div key={club.id} className="bg-card border rounded-2xl p-6 shadow-sm space-y-4 transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl border-2 border-primary/20 bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    {club.logoUrl ? (
                      <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-muted-foreground/40" size={32} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{club.name}</h3>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase", club.plan === "pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {club.plan}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-secondary/20 text-secondary-foreground flex items-center gap-1 border">
                        <span>{langInfo.flag}</span>
                        <span className="uppercase">{club.defaultLanguage || "es"}</span>
                      </span>

                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", club.active ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>
                        {club.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="font-mono font-medium">/{club.slug}</span>

                      {club.inviteCode && (
                        <>
                          <span>•</span>
                          <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px] font-semibold text-foreground border">
                            Código: {club.inviteCode}
                          </span>
                        </>
                      )}

                      <span>•</span>
                      <span>{club.city && club.state ? `${club.city}, ${club.state}` : (club.country || "Chile")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => copyLink(window.location.origin + clubLink, club.id)}
                    className="p-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Copiar enlace del club"
                  >
                    {copiedLinkId === club.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedLinkId === club.id ? "Copiado" : t("copyLink")}</span>
                  </button>

                  {club.inviteCode && (
                    <button
                      onClick={() => copyCode(club.inviteCode!, club.id)}
                      className="p-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Copiar código de invitación"
                    >
                      {copiedCodeId === club.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedCodeId === club.id ? "Copiado" : t("copyCode")}</span>
                    </button>
                  )}

                  <a
                    href={clubLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
                    title="Visitar club"
                  >
                    <ExternalLink size={14} /> {t("visit")}
                  </a>

                  <button
                    onClick={() => openEditModal(club)}
                    className="p-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5 cursor-pointer bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                    title="Editar club y deportes"
                  >
                    <Pencil size={14} /> {t("edit")}
                  </button>

                  <button
                    onClick={() => toggleClubActive(club.id, club.active)}
                    className={cn(
                      "p-2 border rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                      club.active ? "text-destructive hover:bg-destructive/10" : "text-emerald-600 hover:bg-emerald-500/10"
                    )}
                    title={club.active ? "Desactivar club" : "Activar club"}
                  >
                    {club.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    <span>{club.active ? t("deactivate") : "Activar"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{t("sportsEnabled")}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSportsList.map(sport => {
                      const clubSport = (club.sports || []).find(s => s.id === sport.id || s.slug === sport.slug);
                      const isActive = clubSport ? clubSport.active !== false : false;

                      return (
                        <button
                          key={sport.id}
                          onClick={() => toggleSport(club.id, sport.id, isActive)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer",
                            isActive ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/40 text-muted-foreground border-input line-through opacity-70"
                          )}
                        >
                          <span>{sport.name}</span>
                          <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-primary" : "bg-muted-foreground")} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1 bg-muted/20 p-3.5 rounded-xl border">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{t("adminContact")}</span>

                  {hasAdminInfo ? (
                    <>
                      {(club.adminName || club.admin_name) && (
                        <div className="font-medium text-foreground text-sm">
                          {club.adminName || club.admin_name}
                        </div>
                      )}
                      {(club.adminEmail || club.admin_email) && (
                        <div className="text-muted-foreground">
                          {club.adminEmail || club.admin_email}
                        </div>
                      )}
                      {(club.adminPhone || club.admin_phone) && (
                        <div className="text-muted-foreground font-mono">
                          {club.adminPhone || club.admin_phone}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="italic text-muted-foreground/70">
                      {t("noAdminAssigned")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingClub && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-lg">Editar Club: {editingClub.name}</h2>
              <button type="button" onClick={() => setEditingClub(null)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Club</label>
                  <input
                    className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Plan contratado</label>
                  <select
                    value={editForm.plan}
                    onChange={e => setEditForm({...editForm, plan: e.target.value})}
                    className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="basic">Plan Basic</option>
                    <option value="pro">Plan Pro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">🌐 Idioma Predeterminado</label>
                  <select
                    value={editForm.defaultLanguage}
                    onChange={e => setEditForm({...editForm, defaultLanguage: e.target.value})}
                    className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="es">Español 🇪🇸</option>
                    <option value="en">English 🇺🇸</option>
                    <option value="pt">Português 🇧🇷</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 border p-4 rounded-xl bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary" /> Ubicación (País / Estado / Ciudad)
                  </h4>

                  {editClubGeneratedMapUrl && (
                    <a
                      href={editClubGeneratedMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
                    >
                      <MapIcon size={13} /> Probar PIN en Mapa <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">País</label>
                    <select
                      value={editForm.country}
                      onChange={e => handleCountryChange(e.target.value, true)}
                      className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Object.keys(COUNTRY_LOCATIONS).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Región / Estado / Provincia</label>
                    {COUNTRY_LOCATIONS[editForm.country] ? (
                      <select
                        value={editForm.state}
                        onChange={e => handleStateChange(e.target.value, editForm.country, true)}
                        className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Object.keys(COUNTRY_LOCATIONS[editForm.country]).map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        placeholder="Ej. Provincia"
                        className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editForm.state}
                        onChange={e => setEditForm({...editForm, state: e.target.value})}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Comuna / Ciudad</label>
                    {COUNTRY_LOCATIONS[editForm.country]?.[editForm.state] ? (
                      <select
                        value={editForm.city}
                        onChange={e => setEditForm({...editForm, city: e.target.value})}
                        className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {COUNTRY_LOCATIONS[editForm.country][editForm.state].map(ct => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        placeholder="Ej. Ciudad"
                        className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editForm.city}
                        onChange={e => setEditForm({...editForm, city: e.target.value})}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Calle y Número (Dirección)</label>
                    <input
                      placeholder="Ej. Av. Principal 1234"
                      className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editForm.address}
                      onChange={e => setEditForm({...editForm, address: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Enlace Personalizado Mapa (Opcional)</label>
                    <input
                      placeholder="Ej. Waze, PIN específico o dejar en blanco"
                      className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                      value={editForm.mapUrl}
                      onChange={e => setEditForm({...editForm, mapUrl: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="border p-4 rounded-xl bg-muted/25 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Logo del Club (Protagonista)</label>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl border-2 border-primary/30 bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    {editForm.logoUrl ? (
                      <img src={editForm.logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-muted-foreground/40" size={32} />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={e => handleFileUpload(e, url => setEditForm({...editForm, logoUrl: url}))}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Upload size={14} /> Cargar Imagen
                      </button>

                      {editForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditForm({...editForm, logoUrl: ""})}
                          className="p-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Quitar logo"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <input
                      placeholder="O pega el enlace de la imagen..."
                      className="w-full p-2 border rounded-lg text-xs bg-background focus:outline-none font-mono"
                      value={editForm.logoUrl}
                      onChange={e => setEditForm({...editForm, logoUrl: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 border p-4 rounded-xl bg-muted/20">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("sportsEnabled")} y Activación</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availableSportsList.map(sport => {
                    const sportEntry = editForm.sports.find(s => s.id === sport.id);
                    const isActive = sportEntry ? sportEntry.active : false;

                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => {
                          setEditForm(prev => {
                            const exists = prev.sports.find(s => s.id === sport.id);
                            let updatedSports;
                            if (exists) {
                              updatedSports = prev.sports.map(s => s.id === sport.id ? { ...s, active: !s.active } : s);
                            } else {
                              updatedSports = [...prev.sports, { id: sport.id, active: true }];
                            }
                            return { ...prev, sports: updatedSports };
                          });
                        }}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2",
                          isActive ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background text-muted-foreground border-input hover:bg-muted"
                        )}
                      >
                        <span>{sport.name}</span>
                        <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-primary-foreground" : "bg-muted-foreground")} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Módulo de Categorías y Niveles integrado */}
              <div className="border-t pt-4">
                <CategoriesManager 
                  clubId={editingClub.id} 
                  sports={availableSportsList} 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Colores distintivos del Club</label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.primaryColor}
                      onChange={e => setEditForm({...editForm, primaryColor: e.target.value})}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs text-muted-foreground">Primario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.secondaryColor}
                      onChange={e => setEditForm({...editForm, secondaryColor: e.target.value})}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs text-muted-foreground">Secundario</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">👤 Datos del Administrador</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Administrador</label>
                    <input
                      className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editForm.adminName}
                      onChange={e => setEditForm({...editForm, adminName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Apodo / Nickname</label>
                    <input
                      className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editForm.adminNickname}
                      onChange={e => setEditForm({...editForm, adminNickname: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editForm.adminEmail}
                      onChange={e => setEditForm({...editForm, adminEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono / WhatsApp</label>
                    <input
                      className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                      value={editForm.adminPhone}
                      onChange={e => setEditForm({...editForm, adminPhone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Alias WhatsApp</label>
                    <input
                      placeholder="juanperez"
                      className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                      value={editForm.adminWhatsappAlias}
                      onChange={e => setEditForm({...editForm, adminWhatsappAlias: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Preferencia de Contacto</label>
                    <div className="flex bg-muted p-1 rounded-lg border text-xs h-9">
                      <button
                        type="button"
                        onClick={() => setEditForm({...editForm, contactPreference: "whatsapp"})}
                        className={cn(
                          "flex-1 px-2 py-1 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer",
                          editForm.contactPreference === "whatsapp" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({...editForm, contactPreference: "email"})}
                        className={cn(
                          "flex-1 px-2 py-1 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer",
                          editForm.contactPreference === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Mail size={13} /> Correo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({...editForm, contactPreference: "both"})}
                        className={cn(
                          "flex-1 px-2 py-1 rounded-md flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer",
                          editForm.contactPreference === "both" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <AtSign size={13} /> Ambos
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingClub(null)}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleUpdateClub}
                className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <span className="animate-spin">⏳</span> : <Save size={16} />} Actualizar Club
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}