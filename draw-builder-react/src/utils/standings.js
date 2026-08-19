import { flattenMatches } from './bracket';
import { schoolCode } from './names';

const DECIDED_STATUSES = new Set(['completed', 'walkover', 'retired']);

// Per-school win/loss record credited from decided matches (real matches
// only — BYE lines never count). Winner's school gets a win, the other
// side of that match gets a loss. Accepts one bracket or an array of them
// so the tournament-wide leaderboard can fold every draw together.
export function computeSchoolStandings(brackets) {
  const list = (Array.isArray(brackets) ? brackets : [brackets]).filter(Boolean);
  if (!list.length) return [];
  const bySchool = new Map();
  const get = (code) => {
    if (!bySchool.has(code)) bySchool.set(code, { code, wins: 0, losses: 0 });
    return bySchool.get(code);
  };

  list.forEach((bracket) => {
    flattenMatches(bracket)
      .filter((m) => !m.isBye && m.winner && DECIDED_STATUSES.has(m.match.status))
      .forEach(({ a, b, winner }) => {
        const loser = winner.entryNo === a.entryNo ? b : a;
        const winCode = schoolCode(winner.name);
        const loseCode = schoolCode(loser.name);
        if (winCode) get(winCode).wins += 1;
        if (loseCode) get(loseCode).losses += 1;
      });
  });

  return [...bySchool.values()].sort((x, y) => y.wins - x.wins || x.losses - y.losses || x.code.localeCompare(y.code));
}
