import React, { useState, useMemo } from "react";
import { format, addMinutes } from "date-fns";
import { es, enUS, ptBR } from "date-fns/locale";
import { Printer, X, Clock, Calendar, MapPin, Users, Coffee, Swords, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

interface MatchPlayer {
  id: number;
  name: string;
}

interface MatchItem {
  id: number;
  round?: number;
  court?: number;
  team1Players: MatchPlayer[];
  team2Players: MatchPlayer[];
  team1Score?: number;
  team2Score?: number;
  result?: string;
}

interface AsistenciaPlayer {
  playerId: number;
  playerName: string;
  playerNickname?: string | null;
  status: string;
}

interface EncuentroInfo {
  id: number;
  title: string;
  dateTime: string;
  location: string;
  durationMinutes?: number | null;
  courtsAvailable?: number | null;
  formato?: string | null;
  notes?: string | null;
}

interface PrintFixtureModalProps {
  isOpen: boolean;
  onClose: () => void;
  encuentro: EncuentroInfo;
  matches: MatchItem[];
  asistencia: AsistenciaPlayer[];
  clubName?: string;
}

export function PrintFixtureModal({
  isOpen,
  onClose,
  encuentro,
  matches,
  asistencia,
  clubName = "Club de Pádel",
}: PrintFixtureModalProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "en" ? enUS : language === "pt" ? ptBR : es;

  // Configuración de tiempos
  const confirmedPlayers = useMemo(
    () => asistencia.filter((a) => a.status === "confirmed"),
    [asistencia]
  );

  // Agrupar partidos por ronda
  const matchesByRound = useMemo(() => {
    const map = new Map<number, MatchItem[]>();
    for (const m of matches) {
      const r = m.round || 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [matches]);

  const totalRounds = Math.max(1, matchesByRound.length);

  // Estimación inicial razonable de minutos por partido
  const defaultMatchMins = useMemo(() => {
    const totalEventMins = encuentro.durationMinutes || 90;
    // totalEventMins = totalRounds * matchMins + (totalRounds - 1) * 2 min de descanso
    const availableForMatches = totalEventMins - (totalRounds - 1) * 2;
    const calculated = Math.floor(availableForMatches / totalRounds);
    return Math.max(10, Math.min(60, calculated > 0 ? calculated : 20));
  }, [encuentro.durationMinutes, totalRounds]);

  const [matchDuration, setMatchDuration] = useState<number>(defaultMatchMins);
  const [breakDuration, setBreakDuration] = useState<number>(2); // 2 minutos de descanso entre partidos
  const [startTimeStr, setStartTimeStr] = useState<string>(() => {
    try {
      const d = new Date(encuentro.dateTime);
      return format(d, "HH:mm");
    } catch {
      return "19:00";
    }
  });
  const [customNotes, setCustomNotes] = useState<string>(
    "Punto de oro en 40-40. Al sonar el timbre finaliza el partido. Anotar el resultado en la casilla y firmar."
  );
  const [includePlayerRoster, setIncludePlayerRoster] = useState<boolean>(true);

  if (!isOpen) return null;

  // Cálculo del cronograma de cada ronda
  const baseDate = (() => {
    try {
      const original = new Date(encuentro.dateTime);
      const [h, m] = startTimeStr.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        original.setHours(h, m, 0, 0);
      }
      return original;
    } catch {
      return new Date();
    }
  })();

  const roundsSchedule = matchesByRound.map(([roundNum, roundMatches], rIdx) => {
    // Cada ronda rIdx arranca a: rIdx * (matchDuration + breakDuration)
    const roundStart = addMinutes(baseDate, rIdx * (matchDuration + breakDuration));
    const roundEnd = addMinutes(roundStart, matchDuration);
    const nextRoundStart = addMinutes(roundEnd, breakDuration);

    // Identificar qué jugadores confirmados descansan en esta ronda
    const activePlayerIdsInRound = new Set<number>();
    roundMatches.forEach((m) => {
      m.team1Players.forEach((p) => activePlayerIdsInRound.add(p.id));
      m.team2Players.forEach((p) => activePlayerIdsInRound.add(p.id));
    });

    const restingInRound = confirmedPlayers.filter(
      (cp) => !activePlayerIdsInRound.has(cp.playerId)
    );

    return {
      roundNum,
      matches: roundMatches,
      startTimeFormatted: format(roundStart, "HH:mm"),
      endTimeFormatted: format(roundEnd, "HH:mm"),
      nextRoundStartFormatted: format(nextRoundStart, "HH:mm"),
      restingPlayers: restingInRound,
      isLastRound: rIdx === matchesByRound.length - 1,
    };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Contenedor del Modal */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Cabecera de configuración (Oculta en impresión) */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/30 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Planilla Imprimible del Fixture
                <span className="text-xs font-normal text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Descanso 2 min entre partidos
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Configura tiempos, cronograma y casillas de resultados antes de imprimir o guardar en PDF.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Panel de Ajustes Rápidos (Oculto en impresión) */}
        <div className="p-4 bg-muted/20 border-b border-border/50 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs print:hidden">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground block">
              ⏱️ Duración por Partido
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={5}
                max={120}
                value={matchDuration}
                onChange={(e) => setMatchDuration(Math.max(5, parseInt(e.target.value) || 20))}
                className="w-16 h-8 px-2 text-center font-bold bg-background border rounded-lg text-sm"
              />
              <span className="text-muted-foreground">minutos</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground block">
              ☕ Descanso entre Rondas
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={30}
                value={breakDuration}
                onChange={(e) => setBreakDuration(Math.max(1, parseInt(e.target.value) || 2))}
                className="w-16 h-8 px-2 text-center font-bold bg-background border rounded-lg text-sm"
              />
              <span className="text-muted-foreground">min (Recomendado: 2)</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground block">
              🕒 Hora de Inicio
            </label>
            <input
              type="time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              className="h-8 px-2 font-mono font-semibold bg-background border rounded-lg text-sm"
            />
          </div>

          <div className="space-y-1 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground pb-1">
              <input
                type="checkbox"
                checked={includePlayerRoster}
                onChange={(e) => setIncludePlayerRoster(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              Incluir lista de jugadores
            </label>
          </div>
        </div>

        {/* Vista Previa de la Hoja Imprimible (Lo que se imprime) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white text-black font-sans print:p-0 print:m-0 print:overflow-visible">
          
          <div id="printable-sheet" className="max-w-3xl mx-auto space-y-4 print:max-w-none print:w-full">
            
            {/* Encabezado del Documento */}
            <div className="border-b-2 border-black pb-3 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-600 block">
                  {clubName} • HOJA OFICIAL DE COMPETICIÓN
                </span>
                <h1 className="text-2xl font-black text-black leading-tight uppercase tracking-tight">
                  {encuentro.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-black" />
                    {format(baseDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-black" />
                    Inicio: <strong>{startTimeStr} hrs</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-black" />
                    {encuentro.location}
                  </span>
                </div>
              </div>

              {/* Caja de Parámetros */}
              <div className="text-right border border-black bg-gray-50 p-2 rounded shrink-0 text-xs">
                <p className="font-bold text-black uppercase">Parámetros</p>
                <p className="text-gray-700">Partidos: <strong>{matchDuration} min</strong></p>
                <p className="text-gray-700">Descanso: <strong>{breakDuration} min</strong></p>
                <p className="text-gray-700">Rondas: <strong>{totalRounds}</strong></p>
              </div>
            </div>

            {/* Cronograma Ronda por Ronda */}
            <div className="space-y-4 pt-1">
              {roundsSchedule.map((round) => (
                <div
                  key={`round-sheet-${round.roundNum}`}
                  className="border border-black rounded-lg overflow-hidden break-inside-avoid"
                >
                  {/* Barra de la Ronda */}
                  <div className="bg-gray-100 border-b border-black px-3 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-black text-white px-2 py-0.5 rounded text-xs font-black">
                        RONDA {round.roundNum}
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        Horario: {round.startTimeFormatted} - {round.endTimeFormatted} ({matchDuration} min)
                      </span>
                    </div>

                    <span className="text-[11px] text-gray-600 font-semibold">
                      {round.matches.length} pista{round.matches.length > 1 ? "s" : ""} en simultáneo
                    </span>
                  </div>

                  {/* Partidos de la Ronda */}
                  <div className="divide-y divide-gray-300">
                    {round.matches.map((match, mIdx) => (
                      <div key={match.id} className="p-3 flex items-center gap-3">
                        {/* Indicador de Pista */}
                        <div className="w-16 shrink-0 text-center border-r border-gray-300 pr-2">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block">Cancha</span>
                          <span className="text-sm font-black text-black">
                            Pista {match.court || (mIdx + 1)}
                          </span>
                        </div>

                        {/* Pareja 1 */}
                        <div className="flex-1 text-right pr-2">
                          <p className="font-bold text-sm text-black leading-tight">
                            {match.team1Players.map((p) => p.name).join(" / ") || "Equipo 1"}
                          </p>
                          <span className="text-[10px] text-gray-500">Pareja 1</span>
                        </div>

                        {/* CASILLAS MANUALES DE RESULTADO */}
                        <div className="shrink-0 flex flex-col items-center justify-center px-2">
                          <div className="flex items-center gap-1.5">
                            {/* Casilla Pareja 1 */}
                            <div className="w-12 h-10 border-2 border-black rounded bg-white flex items-center justify-center text-lg font-black text-black shadow-inner">
                              {match.team1Score !== undefined && match.team1Score > 0 ? match.team1Score : ""}
                            </div>
                            <span className="font-black text-sm text-gray-600">—</span>
                            {/* Casilla Pareja 2 */}
                            <div className="w-12 h-10 border-2 border-black rounded bg-white flex items-center justify-center text-lg font-black text-black shadow-inner">
                              {match.team2Score !== undefined && match.team2Score > 0 ? match.team2Score : ""}
                            </div>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-gray-500 mt-0.5 tracking-wider">
                            Puntos / Games
                          </span>
                        </div>

                        {/* Pareja 2 */}
                        <div className="flex-1 text-left pl-2">
                          <p className="font-bold text-sm text-black leading-tight">
                            {match.team2Players.map((p) => p.name).join(" / ") || "Equipo 2"}
                          </p>
                          <span className="text-[10px] text-gray-500">Pareja 2</span>
                        </div>

                        {/* Checkbox de Ganador y Firma */}
                        <div className="w-28 shrink-0 border-l border-gray-300 pl-2 text-[10px] text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 border border-black inline-block rounded-sm"></span>
                            <span>Gana P1</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 border border-black inline-block rounded-sm"></span>
                            <span>Gana P2</span>
                          </div>
                          <div className="text-[9px] text-gray-400 pt-0.5">Firma: _________</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Jugadores que descansan en esta ronda (si hay) */}
                  {round.restingPlayers.length > 0 && (
                    <div className="bg-amber-50/80 border-t border-amber-200 px-3 py-1 text-[11px] text-amber-900 flex items-center gap-1.5">
                      <Coffee size={13} className="text-amber-700" />
                      <span>
                        <strong>Descansan en esta ronda:</strong>{" "}
                        {round.restingPlayers.map((rp) => rp.playerName).join(", ")}
                      </span>
                    </div>
                  )}

                  {/* AVISO DEL DESCANSO DE 2 MINUTOS ENTRE RONDAS */}
                  {!round.isLastRound && (
                    <div className="bg-gray-100 border-t border-dashed border-gray-400 px-3 py-1 text-[10px] text-gray-700 flex items-center justify-between font-mono">
                      <span>
                        ⏳ <strong>DESCANSO DE {breakDuration} MINUTOS:</strong> {round.endTimeFormatted} a {round.nextRoundStartFormatted}
                      </span>
                      <span>Rotación de pistas y calentamiento corto</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Lista de Jugadores / Asistencia (Opcional) */}
            {includePlayerRoster && confirmedPlayers.length > 0 && (
              <div className="pt-2 break-inside-avoid">
                <div className="border border-black rounded-lg overflow-hidden text-xs">
                  <div className="bg-gray-100 border-b border-black px-3 py-1.5 flex items-center justify-between font-bold">
                    <span>LISTA DE JUGADORES CONFIRMADOS ({confirmedPlayers.length})</span>
                    <span className="font-normal text-[11px] text-gray-600">Control de asistencia y pagos</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-200 p-2 gap-1 text-[11px]">
                    {confirmedPlayers.map((player, pIdx) => (
                      <div key={player.playerId} className="p-1 flex items-center justify-between">
                        <span className="font-semibold">
                          {pIdx + 1}. {player.playerName}
                        </span>
                        <div className="flex items-center gap-2 text-gray-500 text-[10px]">
                          <span>[ ] OK</span>
                          <span>[ ] $</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notas del Encuentro y Reglas */}
            <div className="border border-black p-2.5 rounded-lg text-xs space-y-1 bg-gray-50 break-inside-avoid">
              <span className="font-bold text-black uppercase text-[10px]">
                Normativa y Reglamento del Encuentro:
              </span>
              <p className="text-gray-700 text-[11px] leading-relaxed">
                {customNotes}
              </p>
            </div>

            {/* Pie de Página para Impresión */}
            <div className="pt-2 text-[10px] text-gray-500 flex items-center justify-between border-t border-gray-300">
              <span>Generado con Padel Tracker • Software de Gestión Deportiva</span>
              <span>Página 1 de 1 • Firma del Juez Árbitro / Organizador: _____________________</span>
            </div>

          </div>
        </div>

        {/* Barra de Acciones del Modal (Oculta al imprimir) */}
        <div className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between print:hidden">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckSquare size={14} className="text-emerald-500" />
            <span>Planilla lista con casillas de anotación y tiempos calculados.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="text-xs">
              Cerrar
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-primary text-primary-foreground font-semibold text-xs gap-2 px-5 hover:opacity-90 shadow-md"
            >
              <Printer size={15} />
              🖨️ Imprimir / Guardar en PDF
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
