import { useState, useEffect } from "react";
import { Check, AlertCircle, Upload, Plus, Trash2, Image as ImageIcon, Calculator } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useListPlayers } from "@workspace/api-client-react";

interface CobroItem {
  concepto: string;
  monto: number;
}

interface Cobro {
  id: number;
  playerId: number;
  monto: number;
  items: CobroItem[] | null;
  estado: string; // "pendiente" | "reportado" | "pagado"
  notas: string | null;
  comprobanteUrl: string | null;
  createdAt: string;
}

interface PlayerOption {
  id: number;
  name: string;
}

interface TorneoCalculo {
  id: number;
  nombre: string;
  items: CobroItem[];
  descuento: number;
  jugadorIds: number[];
  aplicado: boolean;
}

type ItemRow = { concepto: string; monto: string };

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

const inputCls = "w-full border rounded-lg p-2 text-sm bg-background text-foreground";

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

function sumRows(rows: ItemRow[]): number {
  return rows.reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
}

// Editor reutilizable de líneas "concepto + monto" (conceptos libres).
function ItemRowsEditor({
  rows,
  setRows,
}: {
  rows: ItemRow[];
  setRows: (rows: ItemRow[]) => void;
}) {
  const update = (i: number, field: "concepto" | "monto", value: string) => {
    const next = rows.slice();
    next[i] = { ...next[i], [field]: value };
    setRows(next);
  };
  const addRow = () => setRows([...rows, { concepto: "", monto: "" }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Concepto (ej. Cancha 14/9)"
            value={row.concepto}
            onChange={(e) => update(i, "concepto", e.target.value)}
            className={inputCls + " flex-[2]"}
          />
          <input
            type="number"
            placeholder="Monto"
            value={row.monto}
            onChange={(e) => update(i, "monto", e.target.value)}
            className={inputCls + " flex-1"}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="p-2 text-red-500 hover:bg-red-50 rounded"
              title="Quitar"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-primary flex items-center gap-1 hover:underline"
      >
        <Plus size={12} /> Agregar concepto
      </button>
      <div className="text-sm font-medium text-right">Total: ${sumRows(rows)}</div>
    </div>
  );
}

export default function Cobros() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = !!user && (!!user.isAdmin || !!user.isClubAdmin);

  const [cobros, setCobros] = useState<Cobro[]>([]);
  const { data: playersData } = useListPlayers();
  const players: PlayerOption[] = (playersData as any) || [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario "Nuevo cobro" (solo admin)
  const [showForm, setShowForm] = useState(false);
  const [formPlayerId, setFormPlayerId] = useState("");
  const [formItems, setFormItems] = useState<ItemRow[]>([{ concepto: "", monto: "" }]);
  const [formNotas, setFormNotas] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  // Comprobante / acción por fila, mientras el jugador la sube
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  // Calculadora de torneo (solo admin)
  const [showCalc, setShowCalc] = useState(false);
  const [calculos, setCalculos] = useState<TorneoCalculo[]>([]);
  const [calcNombre, setCalcNombre] = useState("");
  const [calcItems, setCalcItems] = useState<ItemRow[]>([{ concepto: "", monto: "" }]);
  const [calcDescuento, setCalcDescuento] = useState("0");
  const [calcJugadores, setCalcJugadores] = useState<number[]>([]);
  const [savingCalc, setSavingCalc] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const loadCobros = () => {
    fetch("/api/cobros")
      .then((res) => res.json())
      .then((data) => setCobros(Array.isArray(data) ? data : []))
      .catch(() => setCobros([]))
      .finally(() => setLoading(false));
  };

  const loadCalculos = () => {
    fetch("/api/torneo-calculos")
      .then((res) => res.json())
      .then((data) => setCalculos(Array.isArray(data) ? data : []))
      .catch(() => setCalculos([]));
  };

  useEffect(() => {
    if (authLoading) return;
    loadCobros();
    if (isAdmin) loadCalculos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  const nombreJugador = (playerId: number) =>
    players.find((p) => p.id === playerId)?.name || `Jugador #${playerId}`;

  const crearCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const items = formItems
      .filter((r) => r.concepto.trim() && r.monto !== "")
      .map((r) => ({ concepto: r.concepto.trim(), monto: Number(r.monto) }));

    if (!formPlayerId) {
      setError("Elige un jugador");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un concepto con su monto");
      return;
    }
    setSavingForm(true);
    try {
      const res = await fetch("/api/cobros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: Number(formPlayerId),
          items,
          notas: formNotas || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo crear el cobro");
      }
      setFormPlayerId("");
      setFormItems([{ concepto: "", monto: "" }]);
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

  const crearCalculo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const items = calcItems
      .filter((r) => r.concepto.trim() && r.monto !== "")
      .map((r) => ({ concepto: r.concepto.trim(), monto: Number(r.monto) }));

    if (!calcNombre.trim()) {
      setError("Ponle un nombre al torneo/actividad");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un costo");
      return;
    }
    if (calcJugadores.length === 0) {
      setError("Selecciona al menos un jugador para repartir el costo");
      return;
    }
    setSavingCalc(true);
    try {
      const res = await fetch("/api/torneo-calculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: calcNombre.trim(),
          items,
          descuento: Number(calcDescuento) || 0,
          jugadorIds: calcJugadores,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo guardar la calculadora");
      }
      setCalcNombre("");
      setCalcItems([{ concepto: "", monto: "" }]);
      setCalcDescuento("0");
      setCalcJugadores([]);
      loadCalculos();
    } catch (err: any) {
      setError(err.message || "No se pudo guardar la calculadora");
    } finally {
      setSavingCalc(false);
    }
  };

  const aplicarCalculo = async (id: number) => {
    setApplyingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/torneo-calculos/${id}/aplicar`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo aplicar la calculadora");
      }
      loadCalculos();
      loadCobros();
    } catch (err: any) {
      setError(err.message || "No se pudo aplicar la calculadora");
    } finally {
      setApplyingId(null);
    }
  };

  const toggleJugadorCalc = (id: number) => {
    setCalcJugadores((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const calcTotal = sumRows(calcItems) - (Number(calcDescuento) || 0);
  const calcPP = calcJugadores.length > 0 ? Math.round(calcTotal / calcJugadores.length) : 0;

  if (loading || authLoading) {
    return <div className="p-6 text-muted-foreground">Cargando cobros...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Planilla de Cobros</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowCalc((v) => !v)}
              className="flex items-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:opacity-90"
            >
              <Calculator size={16} /> Calculadora de torneo
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
            >
              <Plus size={16} /> Nuevo cobro
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {isAdmin && showForm && (
        <form onSubmit={crearCobro} className="bg-card border rounded-xl p-4 space-y-3 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Jugador</label>
            <select
              value={formPlayerId}
              onChange={(e) => setFormPlayerId(e.target.value)}
              className={inputCls}
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
            <label className="block text-sm font-medium mb-1">Conceptos</label>
            <ItemRowsEditor rows={formItems} setRows={setFormItems} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
            <textarea
              value={formNotas}
              onChange={(e) => setFormNotas(e.target.value)}
              className={inputCls}
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

      {isAdmin && showCalc && (
        <div className="bg-card border rounded-xl p-4 space-y-4 max-w-2xl">
          <h2 className="font-semibold">Calculadora de torneo</h2>
          <p className="text-xs text-muted-foreground">
            Ingresa los costos (proveedores, cancha, etc.), un descuento si aplica, y a qué jugadores se les reparte. Al aplicar, se crea un cobro con ese monto por persona para cada uno.
          </p>
          <form onSubmit={crearCalculo} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre (ej. 3er Torneo)</label>
              <input
                type="text"
                value={calcNombre}
                onChange={(e) => setCalcNombre(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Costos</label>
              <ItemRowsEditor rows={calcItems} setRows={setCalcItems} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descuento</label>
              <input
                type="number"
                value={calcDescuento}
                onChange={(e) => setCalcDescuento(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Jugadores que lo dividen ({calcJugadores.length})
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {players.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={calcJugadores.includes(p.id)}
                      onChange={() => toggleJugadorCalc(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="text-sm bg-muted/50 rounded-lg p-3 flex justify-between">
              <span>Total: ${calcTotal}</span>
              <span className="font-semibold">Por jugador: ${calcPP}</span>
            </div>
            <button
              type="submit"
              disabled={savingCalc}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
            >
              {savingCalc ? "Guardando..." : "Guardar calculadora"}
            </button>
          </form>

          {calculos.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <h3 className="text-sm font-medium">Calculadoras guardadas</h3>
              {calculos.map((c) => {
                const total = c.items.reduce((acc, it) => acc + it.monto, 0) - c.descuento;
                const pp = c.jugadorIds.length > 0 ? Math.round(total / c.jugadorIds.length) : 0;
                return (
                  <div key={c.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
                    <div>
                      <div className="font-medium">{c.nombre}</div>
                      <div className="text-muted-foreground text-xs">
                        Total ${total} · {c.jugadorIds.length} jugadores · ${pp} c/u
                      </div>
                    </div>
                    {c.aplicado ? (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Aplicado</span>
                    ) : (
                      <button
                        onClick={() => aplicarCalculo(c.id)}
                        disabled={applyingId === c.id}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs disabled:opacity-50"
                      >
                        {applyingId === c.id ? "Aplicando..." : "Aplicar a jugadores"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {isAdmin && <th className="p-3 text-left">Jugador</th>}
              <th className="p-3 text-left">Detalle</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-left">Comprobante</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cobros.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-6 text-center text-muted-foreground">
                  No hay cobros registrados todavía.
                </td>
              </tr>
            )}
            {cobros.map((cobro) => (
              <tr key={cobro.id} className="border-b last:border-0 align-top">
                {isAdmin && <td className="p-3">{nombreJugador(cobro.playerId)}</td>}
                <td className="p-3 text-xs text-muted-foreground">
                  {cobro.items && cobro.items.length > 0 ? (
                    <ul className="space-y-0.5">
                      {cobro.items.map((it, i) => (
                        <li key={i}>
                          {it.concepto}: ${it.monto}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 font-medium">${cobro.monto}</td>
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
