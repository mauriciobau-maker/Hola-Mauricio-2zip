import { useEffect, useMemo, useState } from "react";
import { Plus, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: number;
  sportId: number;
  clubSportId: number;
  name: string;
}

interface Sport {
  id: number;
  name: string;
  slug: string;
  active?: boolean;
}

interface CategoriesManagerProps {
  clubId: number;
  sports: Sport[];
}

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  padel: ["1ª Categoría", "2ª Categoría", "3ª Categoría", "4ª Categoría", "Principiantes"],
  tenis: ["Singles A", "Singles B", "Dobles", "Senior"],
  futbol: ["Libre / Open", "Senior +35", "Mixto", "Empresas"],
};

export default function CategoriesManager({ sports }: CategoriesManagerProps) {
  const [selectedSportId, setSelectedSportId] = useState<number>(sports[0]?.id || 1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeSports = useMemo(() => sports.filter((sport) => sport.active !== false), [sports]);
  const currentSport = activeSports.find((sport) => sport.id === selectedSportId) || activeSports[0];
  const currentCategories = categories.filter((category) => category.sportId === currentSport?.id);

  useEffect(() => {
    if (activeSports.length > 0 && !activeSports.some((sport) => sport.id === selectedSportId)) {
      setSelectedSportId(activeSports[0].id);
    }
  }, [activeSports, selectedSportId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/club/categories", { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudieron cargar las categorías");
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando categorías del club:", err);
      setError("No se pudieron cargar las categorías del club.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSport || !newCatName.trim()) return;

    const normalizedName = newCatName.trim();
    if (currentCategories.some((category) => category.name.toLowerCase() === normalizedName.toLowerCase())) {
      setError("Ya existe una categoría con ese nombre para este deporte.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await fetch("/api/club/categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sportId: currentSport.id, name: normalizedName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudo crear la categoría");
      setCategories((previous) => [...previous, data]);
      setNewCatName("");
    } catch (err) {
      console.error("Error creando categoría:", err);
      setError("No se pudo guardar la categoría.");
    } finally {
      setSaving(false);
    }
  };

  const loadDefaults = async () => {
    if (!currentSport) return;
    const defaults = DEFAULT_CATEGORIES[currentSport.slug] || ["Categoría General"];
    const existingNames = new Set(currentCategories.map((category) => category.name.toLowerCase()));

    for (const name of defaults.filter((candidate) => !existingNames.has(candidate.toLowerCase()))) {
      try {
        const response = await fetch("/api/club/categories", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sportId: currentSport.id, name }),
        });
        if (response.ok) {
          const created = await response.json();
          setCategories((previous) => [...previous, created]);
        }
      } catch (err) {
        console.error("Error cargando categoría sugerida:", err);
      }
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Trophy size={20} className="text-primary" /> Gestión de Categorías y Niveles
          </h2>
          <p className="text-xs text-muted-foreground">Las categorías se guardan en la configuración real de la comunidad.</p>
        </div>
        <button
          onClick={() => void loadDefaults()}
          type="button"
          disabled={saving || loading || !currentSport}
          className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          Cargar sugeridas
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeSports.map((sport) => (
          <button
            key={sport.id}
            type="button"
            onClick={() => setSelectedSportId(sport.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
              selectedSportId === sport.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-input hover:bg-muted",
            )}
          >
            {sport.name}
          </button>
        ))}
      </div>

      <form onSubmit={handleAddCategory} className="bg-muted/30 border p-4 rounded-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Añadir categoría para {currentSport?.name || "el deporte"}
        </h3>
        <div className="flex gap-2">
          <input
            placeholder="Ej. 1ª Categoría"
            className="flex-1 p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={saving || loading || !currentSport}
            className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus size={14} /> Registrar
          </button>
        </div>
      </form>

      {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Categorías configuradas en {currentSport?.name} ({currentCategories.length})
        </h3>

        {loading ? (
          <p className="text-xs text-muted-foreground italic">Cargando categorías...</p>
        ) : currentCategories.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-xs italic">
            No hay categorías registradas para este deporte.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentCategories.map((category) => (
              <div key={category.id} className="border p-3.5 rounded-xl bg-card shadow-sm">
                <span className="font-bold text-sm">{category.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
