export function cleanSeedName(name) {
  return name.replace(/\s*\(\d+\)\s*$/, '').trim();
}

export function normalizeName(name) {
  return cleanSeedName(String(name || '')).toLowerCase().replace(/\s+/g, ' ');
}

export function parseSeedLines(text) {
  return text.split(/\n+/).map((s) => cleanSeedName(s)).filter(Boolean);
}

export function parseLineNumbers(text) {
  return (text.match(/\d+/g) || []).map((s) => parseInt(s, 10));
}
