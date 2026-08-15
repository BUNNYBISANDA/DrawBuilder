import { normalizeName, parseSeedEntry } from './names';

export function seedOrder(n) {
  let order = [1];
  while (order.length < n) {
    const m = order.length * 2;
    const next = [];
    order.forEach((s) => next.push(s, m + 1 - s));
    order = next;
  }
  return order;
}

export function nextPowerOfTwo(n) {
  let size = 2;
  while (size < n) size *= 2;
  return size;
}

export function selectedDrawSize(entryCount, drawSize) {
  const needed = nextPowerOfTwo(entryCount);
  const chosen = drawSize === 'auto' ? 0 : parseInt(drawSize, 10);
  return Math.max(needed, chosen || needed);
}

function firstOpenSlot(round) {
  return round.findIndex((cell) => !cell);
}

function byeCell() {
  return { name: 'BYE', entryNo: null, seed: null, bye: true };
}

function applyCustomByes(round, size, byeCount, customByes) {
  const result = { applied: 0, skipped: [], invalid: [], extra: 0 };
  if (!byeCount) return result;
  for (const line of customByes) {
    if (result.applied >= byeCount) {
      result.extra++;
      continue;
    }
    if (line < 1 || line > size) {
      result.invalid.push(line);
      continue;
    }
    const slot = line - 1;
    if (round[slot]) {
      result.skipped.push(line);
      continue;
    }
    round[slot] = byeCell();
    result.applied++;
  }
  return result;
}

export const MATCH_STATUSES = ['scheduled', 'in-progress', 'completed', 'walkover', 'retired'];

export function emptyMatch() {
  return { sets: [], court: '', scheduledTime: '', status: 'scheduled' };
}

function buildMatches(size) {
  const roundsCount = Math.log2(size) + 1;
  const matches = [];
  for (let r = 0; r < roundsCount - 1; r++) {
    matches.push(new Array(size >> (r + 1)).fill(null).map(() => emptyMatch()));
  }
  return matches;
}

export function ensureMatches(bracket) {
  if (bracket.matches) return bracket.matches;
  return buildMatches(bracket.size);
}

export function autoAdvanceByes(br) {
  for (let r = 1; r < br.rounds.length; r++) br.rounds[r].fill(null);
  for (let m = 0; m < br.size / 2; m++) {
    const a = br.rounds[0][2 * m];
    const b = br.rounds[0][2 * m + 1];
    if (a && b && a.bye && !b.bye) br.rounds[1][m] = { ...b };
    if (a && b && b.bye && !a.bye) br.rounds[1][m] = { ...a };
  }
}

export function buildBracket(event) {
  const players = event.players.map((name) => String(name || '').trim()).filter(Boolean);
  if (players.length < 2) {
    return { error: 'Need at least 2 entries to make a draw.' };
  }
  const size = selectedDrawSize(players.length, event.drawSize);
  const seedLines = seedOrder(size);
  const roundsCount = Math.log2(size) + 1;
  const rounds = [];
  for (let r = 0; r < roundsCount; r++) rounds.push(new Array(size >> r).fill(null));

  const entries = players.map((name, i) => ({ name, entryNo: i + 1, seed: null, bye: false }));
  const entryByName = new Map();
  entries.forEach((entry) => {
    const key = normalizeName(entry.name);
    if (!entryByName.has(key)) entryByName.set(key, entry);
  });

  const usedEntries = new Set();
  const usedLines = new Set();
  const parsedSeeds = event.seeds.map(parseSeedEntry);

  // Pass 1: seeds pinned to a known line (e.g. the actual result of a
  // tournament's lot draw for seeds beyond #1/#2) go exactly where told.
  const pinResult = { invalid: [], taken: [] };
  parsedSeeds.forEach((seedEntry, seedIndex) => {
    if (!seedEntry.line) return;
    const entry = entryByName.get(normalizeName(seedEntry.name));
    if (!entry || usedEntries.has(entry.entryNo)) return;
    if (seedEntry.line < 1 || seedEntry.line > size) { pinResult.invalid.push(seedEntry.name); return; }
    const slot = seedEntry.line - 1;
    if (rounds[0][slot]) { pinResult.taken.push(seedEntry.name); return; }
    entry.seed = seedIndex + 1;
    rounds[0][slot] = { ...entry };
    usedEntries.add(entry.entryNo);
    usedLines.add(seedEntry.line);
  });

  // Pass 2: remaining seeds (no pinned line) auto-place by rank, walking
  // the standard seed template and skipping any line already spoken for.
  let templatePos = 0;
  parsedSeeds.forEach((seedEntry, seedIndex) => {
    if (seedEntry.line) return;
    const entry = entryByName.get(normalizeName(seedEntry.name));
    if (!entry || usedEntries.has(entry.entryNo)) return;
    let line = null;
    while (templatePos < seedLines.length) {
      const candidate = seedLines[templatePos++];
      if (!usedLines.has(candidate) && !rounds[0][candidate - 1]) { line = candidate; break; }
    }
    if (!line) return;
    entry.seed = seedIndex + 1;
    rounds[0][line - 1] = { ...entry };
    usedEntries.add(entry.entryNo);
    usedLines.add(line);
  });

  const byeResult = applyCustomByes(rounds[0], size, size - players.length, event.customByes);
  entries.forEach((entry) => {
    if (usedEntries.has(entry.entryNo)) return;
    const nextOpen = firstOpenSlot(rounds[0]);
    if (nextOpen >= 0) rounds[0][nextOpen] = { ...entry };
  });
  for (let slot = 0; slot < size; slot++) {
    if (!rounds[0][slot]) rounds[0][slot] = byeCell();
  }

  // Tag every round-1 cell with the draw line it started on. This travels
  // forward through advance()'s `{...cell}` copies, so later rounds show
  // the player's original line number instead of an unrelated numbering.
  rounds[0].forEach((cell, i) => { if (cell) cell.line = i + 1; });

  const bracket = { size, rounds, entrants: players.length, matches: buildMatches(size) };
  autoAdvanceByes(bracket);
  return { bracket, byeResult, pinResult };
}

export function flattenMatches(bracket) {
  const list = [];
  const R = bracket.rounds.length;
  for (let r = 0; r < R - 1; r++) {
    const teams = bracket.size >> r;
    const roundLabel = teams === 2 ? 'Final' : teams === 4 ? 'Semifinals' : teams === 8 ? 'Quarterfinals' : 'Round of ' + teams;
    const round = bracket.rounds[r];
    for (let m = 0; m < round.length / 2; m++) {
      const a = round[2 * m];
      const b = round[2 * m + 1];
      const match = (bracket.matches && bracket.matches[r] && bracket.matches[r][m]) || emptyMatch();
      list.push({ r, m, roundLabel, a, b, match, isBye: !a || !b || a.bye || b.bye });
    }
  }
  return list;
}

export function samePlayer(a, b) {
  return !!(a && b && a.entryNo === b.entryNo && a.name === b.name);
}

export function clearDownstream(br, r, i, player) {
  if (r >= br.rounds.length) return;
  const c = br.rounds[r][i];
  if (samePlayer(c, player)) {
    br.rounds[r][i] = null;
    clearDownstream(br, r + 1, i >> 1, player);
  }
}

export function propagateRename(br, entryNo, newName) {
  br.rounds.forEach((round) => round.forEach((c) => {
    if (c && c.entryNo === entryNo) c.name = newName;
  }));
}

export function displayPlayerName(cell) {
  if (!cell) return '';
  return cell.seed ? `${cell.name} (${cell.seed})` : cell.name;
}
