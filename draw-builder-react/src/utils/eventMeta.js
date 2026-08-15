export const CATEGORY_PRESETS = ['Open', 'U19', 'U17', 'U15', 'U13', 'U11', 'Veterans'];
export const GENDER_OPTIONS = ['', 'Boys', 'Girls', 'Men', 'Women', 'Mixed'];
export const TYPE_OPTIONS = ['Singles', 'Doubles', 'Mixed Doubles'];

export function deriveEventName({ category, gender, type }) {
  const parts = [category, gender, type].map((p) => (p || '').trim()).filter(Boolean);
  return parts.length ? parts.join(' ') : 'Event';
}

// Sort key that groups events by category, then gender, then type,
// so same-category events land next to each other in the tab bar.
export function categorySortKey(ev) {
  return [ev.category || 'zzzz-uncategorized', ev.gender || '', ev.type || ''].join('|');
}
