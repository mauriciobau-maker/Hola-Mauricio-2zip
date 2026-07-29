import { useCreatePlayer, getListPlayersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "lucide-react";

const MOCK_PLAYERS = [
  { name: "Carlos Ruiz", nickname: "El Muro" },
  { name: "Ana Martinez", nickname: "La Zurda" },
  { name: "Jorge Silva", nickname: "Smasher" },
  { name: "Lucia Fernandez", nickname: "Ninja" },
  { name: "Miguel Angel", nickname: "Master" },
];

export function Seeder() {
  const { mutate: createPlayer } = useCreatePlayer();
  const queryClient = useQueryClient();

  const handleSeed = () => {
    MOCK_PLAYERS.forEach((p) => {
      // Usamos la misma estructura exacta que en NuevoJugador.tsx
      createPlayer({
        data: {
          name: p.name,
          nickname: p.nickname,
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        },
        onError: (err) => {
          console.error("Error al crear:", err);
        }
      });
    });
    alert("¡Datos cargados correctamente!");
  };

  return (
    <button
      onClick={handleSeed}
      className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50 flex items-center gap-2"
    >
      <Database size={20} />
      <span className="hidden sm:inline text-xs font-bold">Cargar Demo</span>
    </button>
  );
}