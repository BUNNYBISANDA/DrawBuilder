// Seed for a brand-new tournament — a single blank event to rename/configure
// via "+ Event" or double-click, rather than forcing unused Singles/Doubles
// placeholders on organizers who name events by category (e.g. "U15 Boys Singles").
export const DEFAULT_EVENTS = [
  { name: 'Event 1', category: '', gender: '', type: 'Singles', players: [], seeds: [], drawSize: 'auto', customByes: [], bracket: null, hidden: false, present: [] },
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
    hidden: !!ev.hidden,
    present: Array.isArray(ev.present) ? ev.present : [],
  };
}
