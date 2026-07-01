export const K_FACTOR = 32;
export const STARTING_ELO = 1500;

export function expectedScore(playerElo: number, opponentAvgElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentAvgElo - playerElo) / 400));
}

export interface EloChangeResult {
  playerId: number;
  eloBefore: number;
  eloChange: number;
  eloAfter: number;
}

export function calculateMatchEloChanges(
  team1: Array<{ id: number; elo: number }>,
  team2: Array<{ id: number; elo: number }>,
  team1Won: boolean,
  isDraw = false,
): EloChangeResult[] {
  const team1Avg = team1.reduce((s, p) => s + p.elo, 0) / team1.length;
  const team2Avg = team2.reduce((s, p) => s + p.elo, 0) / team2.length;
  const results: EloChangeResult[] = [];

  for (const player of team1) {
    const exp = expectedScore(player.elo, team2Avg);
    const actual = isDraw ? 0.5 : team1Won ? 1 : 0;
    const change = Math.round(K_FACTOR * (actual - exp));
    results.push({ playerId: player.id, eloBefore: player.elo, eloChange: change, eloAfter: player.elo + change });
  }

  for (const player of team2) {
    const exp = expectedScore(player.elo, team1Avg);
    const actual = isDraw ? 0.5 : team1Won ? 0 : 1;
    const change = Math.round(K_FACTOR * (actual - exp));
    results.push({ playerId: player.id, eloBefore: player.elo, eloChange: change, eloAfter: player.elo + change });
  }

  return results;
}