import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, matchesTable, playersTable } from "@workspace/db";
import {
  CreateMatchBody,
  GetMatchParams,
  DeleteMatchParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichMatch(m: typeof matchesTable.$inferSelect, playerMap: Record<number, string>) {
  return {
    id: m.id,
    team1Player1Id: m.team1Player1Id,
    team1Player2Id: m.team1Player2Id,
    team2Player1Id: m.team2Player1Id,
    team2Player2Id: m.team2Player2Id,
    team1SetsWon: m.team1SetsWon,
    team2SetsWon: m.team2SetsWon,
    sets: m.sets as Array<{ setNumber: number; team1Games: number; team2Games: number }>,
    playedAt: m.playedAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
    team1Player1Name: playerMap[m.team1Player1Id] ?? null,
    team1Player2Name: playerMap[m.team1Player2Id] ?? null,
    team2Player1Name: playerMap[m.team2Player1Id] ?? null,
    team2Player2Name: playerMap[m.team2Player2Id] ?? null,
  };
}

router.get("/matches", async (_req, res): Promise<void> => {
  const matches = await db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt));
  const players = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of players) playerMap[p.id] = p.name;
  const result = await Promise.all(matches.map((m) => enrichMatch(m, playerMap)));
  res.json(result);
});

router.post("/matches", async (req, res): Promise<void> => {
  const parsed = CreateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id, sets, playedAt } = parsed.data;

  // Validate all 4 players are different
  const playerIds = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id];
  if (new Set(playerIds).size !== 4) {
    res.status(400).json({ error: "Los cuatro jugadores deben ser diferentes" });
    return;
  }

  // Calculate sets won from the provided sets
  const setsData = sets as Array<{ setNumber: number; team1Games: number; team2Games: number }>;
  let team1SetsWon = 0;
  let team2SetsWon = 0;
  for (const s of setsData) {
    if (s.team1Games > s.team2Games) team1SetsWon++;
    else if (s.team2Games > s.team1Games) team2SetsWon++;
  }

  const [match] = await db.insert(matchesTable).values({
    team1Player1Id,
    team1Player2Id,
    team2Player1Id,
    team2Player2Id,
    team1SetsWon,
    team2SetsWon,
    sets: setsData,
    playedAt: new Date(playedAt),
  }).returning();

  const players = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of players) playerMap[p.id] = p.name;

  res.status(201).json(await enrichMatch(match, playerMap));
});

router.get("/matches/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMatchParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, params.data.id));
  if (!match) {
    res.status(404).json({ error: "Partido no encontrado" });
    return;
  }
  const players = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of players) playerMap[p.id] = p.name;
  res.json(await enrichMatch(match, playerMap));
});

router.delete("/matches/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMatchParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(matchesTable).where(eq(matchesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Partido no encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;
