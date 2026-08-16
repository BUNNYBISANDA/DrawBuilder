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
    <div className="evt-picker">
      <select
        className="evt-select"
        value={active}
        onChange={(e) => onSelect(Number(e.target.value))}
        title={`${events.length} event${events.length === 1 ? '' : 's'} in this tournament`}
      >
        {useCategories
          ? groups.map((g, gi) => (
              <optgroup label={g.label} key={gi}>
                {g.items.map(({ ev, i }) => <option key={i} value={i}>{ev.name}</option>)}
              </optgroup>
            ))
          : events.map((ev, i) => <option key={i} value={i}>{ev.name}</option>)}
      </select>
      {!readOnly && (
        <>
          <button type="button" className="btn small secondary evt-edit" title="Edit this event's category / gender / type" onClick={() => onEdit(active)}>✎</button>
          <button type="button" className="btn small secondary evt-edit" title="Add a new event" onClick={onAddClick}>+</button>
        </>
      )}
    </div>
  );
}
