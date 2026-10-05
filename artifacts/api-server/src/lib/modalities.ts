import { and, eq, inArray } from "drizzle-orm";
import { db, playersTable, sportModalitiesTable } from "@workspace/db";

export async function getSportModality(sportId: number, modalityId: number) {
  const [modality] = await db
    .select()
    .from(sportModalitiesTable)
    .where(
      and(
        eq(sportModalitiesTable.id, modalityId),
        eq(sportModalitiesTable.sportId, sportId),
        eq(sportModalitiesTable.active, true),
      ),
    );
  return modality ?? null;
}

export async function validatePlayersForClub(playerIds: number[], clubId: number): Promise<boolean> {
  if (playerIds.length === 0 || playerIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return false;
  }
  const players = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(and(inArray(playersTable.id, playerIds), eq(playersTable.clubId, clubId)));
  return players.length === new Set(playerIds).size;
}