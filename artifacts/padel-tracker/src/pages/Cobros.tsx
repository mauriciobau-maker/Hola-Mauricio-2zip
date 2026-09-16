import { useState, useEffect } from "react";
import { Check, AlertCircle, Upload, Plus, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

interface Cobro {
  id: number;
  playerId: number;
  monto: number;
  estado: string; // "pendiente" | "reportado" | "pagado"
  notas: string | null;
  comprobanteUrl: string | null;
  createdAt: string;
}

interface PlayerOption {
  id: number;
  name: string;
}

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  reportado: "bg-blue-100 text-blue-800",
  pagado: "bg-green-100 text-green-800",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  reportado: "Reportado, por confirmar",
  pagado: "Pagado",
};

function resizeToDataUrl(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function Cobros() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = !!user && (!!user.isAdmin || !!user.isClubAdmin);

  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario "Nuevo cobro" (solo admin)
  const [showForm, setShowForm] = useState(false);
  const [formPlayerId, setFormPlayerId] = useState("");
  const [formMonto, setFormMonto] = useState("");
  const [formNotas, setFormNotas] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  // Comprobante por fila, mientras el jugador lo sube
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const loadCobros = () => {
    fetch("/api/cobros")
      .then((res) => res.json())
      .then((data) => setCobros(Array.isArray(data) ? data : []))
      .catch(() => setCobros([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    loadCobros();
    if (isAdmin) {
      fetch("/api/players")
        .then((res) => res.json())
        .then((data) => setPlayers(Array.isArray(data) ? data : []))
        .catch(() => setPlayers([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  const nombreJugador = (playerId: number) =>
    players.find((p) => p.id === playerId)?.name || `Jugador #${playerId}`;

  const crearCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const monto = Number(formMonto);
    if (!formPlayerId || !Number.isFinite(monto) || monto <= 0) {
      setError("Elige un jugador e ingresa un monto válido");
      return;
    }
    setSavingForm(true);
    try {
      const res = await fetch("/api/cobros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: Number(formPlayerId),
          monto,
          notas: formNotas || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo crear el cobro");
      }
      setFormPlayerId("");
      setFormMonto("");
      setFormNotas("");
      setShowForm(false);
      loadCobros();
    } catch (err: any) {
      setError(err.message || "No se pudo crear el cobro");
    } finally {
      setSavingForm(false);
    }
  };

  const confirmarPago = async (id: number) => {
    const res = await fetch(`/api/cobros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "pagado" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCobros((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
  };

  const subirComprobante = async (id: number, file: File) => {
    setUploadingId(id);
    setError(null);
    try {
      const dataUrl = await resizeToDataUrl(file, 900);
      const res = await fetch(`/api/cobros/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comprobanteUrl: dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo enviar el comprobante");
      }
      const updated = await res.json();
      setCobros((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      setError(err.message || "No se pudo enviar el comprobante");
    } finally {
      setUploadingId(null);
    }
  };

  const marcarComoPagado = async (id: number) => {
    setUploadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/cobros/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo reportar el pago");
      }
      const updated = await res.json();
      setCobros((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      setError(err.message || "No se pudo reportar el pago");
    } finally {
      setUploadingId(null);
    }
  };

  if (loading || authLoading) {
    return <div className="p-6 text-muted-foreground">Cargando cobros...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planilla de Cobros</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
          >
            <Plus size={16} /> Nuevo cobro
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {isAdmin && showForm && (
        <form
          onSubmit={crearCobro}
          className="bg-card border rounded-xl p-4 space-y-3 max-w-md"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Jugador</label>
            <select
              value={formPlayerId}
              onChange={(e) => setFormPlayerId(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="">Selecciona un jugador</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monto</label>
            <input
              type="number"
              min={1}
              value={formMonto}
              onChange={(e) => setFormMonto(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
            <textarea
              value={formNotas}
              onChange={(e) => setFormNotas(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={savingForm}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
          >
            {savingForm ? "Guardando..." : "Registrar cobro"}
          </button>
        </form>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {isAdmin && <th className="p-3 text-left">Jugador</th>}
              <th className="p-3 text-left">Monto</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-left">Comprobante</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cobros.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="p-6 text-center text-muted-foreground">
                  No hay cobros registrados todavía.
                </td>
              </tr>
            )}
            {cobros.map((cobro) => (
              <tr key={cobro.id} className="border-b last:border-0">
                {isAdmin && <td className="p-3">{nombreJugador(cobro.playerId)}</td>}
                <td className="p-3">${cobro.monto}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${ESTADO_STYLES[cobro.estado] || "bg-gray-100 text-gray-800"}`}>
                    {ESTADO_LABEL[cobro.estado] || cobro.estado}
                  </span>
                </td>
                <td className="p-3">
                  {cobro.comprobanteUrl ? (
                    <a href={cobro.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <ImageIcon size={14} /> Ver
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-2 justify-end items-center">
                    {isAdmin && cobro.estado !== "pagado" && (
                      <button
                        onClick={() => confirmarPago(cobro.id)}
                        className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                        title="Confirmar pago"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    {!isAdmin && cobro.estado !== "pagado" && (
                      <>
                        <button
                          onClick={() => marcarComoPagado(cobro.id)}
                          disabled={uploadingId === cobro.id}
                          className="px-2 py-2 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                          title="Marcar que ya pagué"
                        >
                          Ya pagué
                        </button>
                        <label className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer" title="Adjuntar comprobante">
                          {uploadingId === cobro.id ? "..." : <Upload size={16} />}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingId === cobro.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) subirComprobante(cobro.id, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
