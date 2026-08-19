export function cleanSeedName(name) {
  return name.replace(/\s*\(\d+\)\s*$/, '').trim();
}

// Entries are stored as "Player Name (CODE)", e.g. "Bihara Jayadevi (MC)" —
// the trailing parenthetical is the player's school code. Seed numbers use
// the same "(N)" shape, so only match when the parenthetical isn't all digits.
export function schoolCode(name) {
  const m = String(name || '').match(/\(([^)]+)\)\s*$/);
  if (!m) return null;
  const code = m[1].trim();
  return /^\d+$/.test(code) ? null : code;
}

export function normalizeName(name) {
  return cleanSeedName(String(name || '')).toLowerCase().replace(/\s+/g, ' ');
}

export function parseSeedLines(text) {
  return text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
}

export function parseLineNumbers(text) {
  return (text.match(/\d+/g) || []).map((s) => parseInt(s, 10));
}

// A seed entry is either just a name (auto-placed by rank, using the
// standard seed template) or "Name @ line" to pin it to a known draw
// line — e.g. the actual result of a tournament's seeding-committee
// lot draw for seeds beyond #1/#2, which no formula can predict.
export function parseSeedEntry(raw) {
  const m = String(raw || '').match(/^(.*?)\s*@\s*(\d+)\s*$/);
  if (m) return { name: cleanSeedName(m[1]), line: parseInt(m[2], 10) };
  return { name: cleanSeedName(raw), line: null };
}

export function renameSeedByName(seeds, oldName, newName) {
  return seeds.map((raw) => {
    const parsed = parseSeedEntry(raw);
    if (normalizeName(parsed.name) !== normalizeName(oldName)) return raw;
    return parsed.line ? `${newName} @ ${parsed.line}` : newName;
  });
}

export function updateSeedName(seeds, index, newName) {
  return seeds.map((raw, i) => {
    if (i !== index) return raw;
    const { line } = parseSeedEntry(raw);
    return line ? `${newName} @ ${line}` : newName;
  });
}
