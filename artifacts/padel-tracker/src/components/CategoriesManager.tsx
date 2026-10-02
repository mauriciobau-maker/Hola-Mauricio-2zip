import { useState } from "react";
import { Plus, Trash2, ShieldCheck, Trophy, Layers, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: number;
  sportId: number;
  name: string;
  levelType: "numeric" | "descriptive" | "age";
  description?: string;
  active: boolean;
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
  futbol: ["Libre / Open", "Senior +35", "Mixto", "Empresas"]
};

export default function CategoriesManager({ clubId, sports }: CategoriesManagerProps) {
  const [selectedSportId, setSelectedSportId] = useState<number>(sports[0]?.id || 1);
  const [categories, setCategories] = useState<Category[]>([
    { id: 1, sportId: 1, name: "1ª Categoría", levelType: "numeric", description: "Jugadores avanzados y profesionales", active: true },
    { id: 2, sportId: 1, name: "2ª Categoría", levelType: "numeric", description: "Jugadores intermedios altos", active: true },
    { id: 3, sportId: 2, name: "Singles A", levelType: "descriptive", description: "Torneo abierto principal", active: true },
  ]);

  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const activeSports = sports.filter(s => s.active !== false);
  const currentSport = activeSports.find(s => s.id === selectedSportId) || activeSports[0];
  const currentCategories = categories.filter(c => c.sportId === selectedSportId);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCategory: Category = {
      id: Date.now(),
      sportId: selectedSportId,
      name: newCatName.trim(),
      levelType: "descriptive",
      description: newCatDesc.trim(),
      active: true
    };

    setCategories(prev => [...prev, newCategory]);
    setNewCatName("");
    setNewCatDesc("");
  };

  const toggleCategoryActive = (catId: number) => {
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, active: !c.active } : c));
  };

  const deleteCategory = (catId: number) => {
    setCategories(prev => prev.filter(c => c.id !== catId));
  };

  const loadDefaults = () => {
    if (!currentSport) return;
    const defaults = DEFAULT_CATEGORIES[currentSport.slug] || ["Categoría General"];

    const existingNames = new Set(currentCategories.map(c => c.name));
    const added: Category[] = defaults
      .filter(name => !existingNames.has(name))
      .map((name, idx) => ({
        id: Date.now() + idx,
        sportId: currentSport.id,
        name,
        levelType: "descriptive",
        description: "Categoría predeterminada del sistema",
        active: true
      }));

    setCategories(prev => [...prev, ...added]);
  };

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Trophy size={20} className="text-primary" /> Gestión de Categorías y Niveles
          </h2>
          <p className="text-xs text-muted-foreground">Configura los niveles de competencia por cada deporte activo del club.</p>
        </div>

        <button
          onClick={loadDefaults}
          type="button"
          className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 self-start"
        >
          <Layers size={14} /> Cargar Sugeridas
        </button>
      </div>

      {/* Selector de Deporte */}
      <div className="flex flex-wrap gap-2">
        {activeSports.map(sport => (
          <button
            key={sport.id}
            type="button"
            onClick={() => setSelectedSportId(sport.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-2",
              selectedSportId === sport.id 
                ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                : "bg-background text-muted-foreground border-input hover:bg-muted"
            )}
          >
            <span>{sport.name}</span>
          </button>
        ))}
      </div>

      {/* Formulario para añadir nueva categoría */}
      <form onSubmit={handleAddCategory} className="bg-muted/30 border p-4 rounded-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">➕ Añadir Nueva Categoría para {currentSport?.name}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre de la Categoría</label>
            <input
              placeholder="Ej. 1ª Categoría / Singles A"
              className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Descripción / Restricción (Opcional)</label>
            <input
              placeholder="Ej. Solo jugadores federados o nivel avanzado"
              className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={newCatDesc}
              onChange={e => setNewCatDesc(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Registrar Categoría
          </button>
        </div>
      </form>

      {/* Listado de Categorías Actuales */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">📋 Categorías Activas en {currentSport?.name} ({currentCategories.length})</h3>

        {currentCategories.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-xs italic">
            No hay categorías registradas para este deporte. Usa el botón "Cargar Sugeridas" o añade una arriba.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentCategories.map(cat => (
              <div key={cat.id} className={cn("border p-3.5 rounded-xl flex items-center justify-between gap-3 transition-all", cat.active ? "bg-card shadow-sm" : "bg-muted/40 opacity-60")}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{cat.name}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", cat.active ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>
                      {cat.active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleCategoryActive(cat.id)}
                    className={cn("p-1.5 rounded-lg border text-xs transition-colors cursor-pointer", cat.active ? "text-destructive hover:bg-destructive/10" : "text-emerald-600 hover:bg-emerald-500/10")}
                    title={cat.active ? "Desactivar" : "Activar"}
                  >
                    {cat.active ? <X size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 rounded-lg border text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Eliminar categoría"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}