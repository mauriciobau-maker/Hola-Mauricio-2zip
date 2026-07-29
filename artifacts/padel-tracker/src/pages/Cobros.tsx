import { useState, useEffect } from "react";
import { Check, Mail, AlertCircle } from "lucide-react";

interface Cobro {
  id: number;
  playerId: number;
  monto: number;
  estado: string;
  notas: string | null;
  createdAt: string;
}

export default function Cobros() {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cobros")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCobros(data);
        } else {
          setCobros([]);
        }
      })
      .catch(() => setCobros([]))
      .finally(() => setLoading(false));
  }, []);

  const confirmarPago = async (id: number) => {
    const res = await fetch(`/api/cobros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "pagado" }),
    });
    if (res.ok) {
      setCobros(prev => prev.map(c => c.id === id ? { ...c, estado: "pagado" } : c));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Planilla de Cobros</h1>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="p-3 text-left">Jugador ID</th>
              <th className="p-3 text-left">Monto</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(cobros) ? cobros : []).map(cobro => (
              <tr key={cobro.id} className="border-b last:border-0">
                <td className="p-3">{cobro.playerId}</td>
                <td className="p-3">${cobro.monto}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${cobro.estado === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {cobro.estado}
                  </span>
                </td>
                <td className="p-3 text-right flex gap-2 justify-end">
                  {cobro.estado !== 'pagado' && (
                    <button onClick={() => confirmarPago(cobro.id)} className="p-2 bg-green-500 text-white rounded hover:bg-green-600">
                      <Check size={16} />
                    </button>
                  )}
                  <button className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    <Mail size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}