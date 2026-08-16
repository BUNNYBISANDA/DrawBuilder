import { categorySortKey } from '../utils/eventMeta';

export default function EventTabs({ events, active, onSelect, onEdit, onAddClick, readOnly = false }) {
  const useCategories = events.some((e) => e.category);
  const indexed = events.map((ev, i) => ({ ev, i }));
  // Only regroup by category once categories are actually in use — a stable
  // sort keeps events with the same category adjacent without reshuffling
  // uncategorized events away from their original tab order.
  const order = useCategories
    ? [...indexed].sort((a, b) => categorySortKey(a.ev).localeCompare(categorySortKey(b.ev)))
    : indexed;

  const groups = [];
  order.forEach(({ ev, i }) => {
    const label = ev.category || 'Uncategorized';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push({ ev, i });
    else groups.push({ label, items: [{ ev, i }] });
  });

  return (
    <nav className="evt-tabs">
      {groups.map((g, gi) => (
        <span className="evt-group" key={gi}>
          {useCategories && (
            <span className="evt-group-label">{g.label}</span>
          )}
          {g.items.map(({ ev, i }) => (
            <button
              key={i}
              className={'evt-tab' + (i === active ? ' active' : '')}
              onClick={() => onSelect(i)}
              onDoubleClick={readOnly ? undefined : () => onEdit(i)}
              title={readOnly ? undefined : 'Double-click to edit category / gender / type'}
            >
              {ev.name}
            </button>
          ))}
        </span>
      ))}
      {!readOnly && <button className="evt-tab add" onClick={onAddClick}>+ Event</button>}
    </nav>
  );
}
