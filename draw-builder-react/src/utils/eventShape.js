export const DEFAULT_EVENTS = [
  { name: 'Singles', category: '', gender: '', type: 'Singles', players: [], seeds: [], drawSize: 'auto', customByes: [], bracket: null },
  { name: 'Doubles', category: '', gender: '', type: 'Doubles', players: [], seeds: [], drawSize: 'auto', customByes: [], bracket: null },
];

export function ensureEventShape(ev) {
  return {
    name: ev.name || 'Event',
    nameOverride: ev.nameOverride || '',
    category: ev.category || '',
    gender: ev.gender || '',
    type: ev.type || 'Singles',
    players: Array.isArray(ev.players) ? ev.players : [],
    seeds: Array.isArray(ev.seeds) ? ev.seeds : [],
    drawSize: ev.drawSize || 'auto',
    customByes: Array.isArray(ev.customByes) ? ev.customByes : [],
    bracket: ev.bracket || null,
  };
}
