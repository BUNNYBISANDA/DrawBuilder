import { useEffect, useRef, useState } from 'react';
import { categorySortKey } from '../utils/eventMeta';

export default function EventTabs({ events, active, onSelect, onEdit, onAddClick, onToggleHidden, readOnly = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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

  const current = events[active];

  return (
    <div className="evt-picker" ref={rootRef}>
      <button
        type="button"
        className={'evt-select-btn' + (open ? ' open' : '')}
        onClick={() => setOpen((v) => !v)}
        title={`${events.length} event${events.length === 1 ? '' : 's'} in this tournament`}
      >
        <span className="evt-select-name">{current ? current.name : 'Select event'}</span>
        <span className="evt-select-caret">▾</span>
      </button>

      {open && (
        <div className="evt-dropdown">
          {groups.map((g, gi) => (
            <div className="evt-dropdown-group" key={gi}>
              {useCategories && <div className="evt-dropdown-label">{g.label}</div>}
              {g.items.map(({ ev, i }) => (
                <div className={'evt-dropdown-row' + (ev.hidden ? ' hidden-draw' : '')} key={i}>
                  <button
                    type="button"
                    className={'evt-dropdown-item' + (i === active ? ' active' : '')}
                    onClick={() => { onSelect(i); setOpen(false); }}
                  >
                    {ev.name}{ev.hidden ? <span className="evt-hidden-tag">Hidden</span> : null}
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      className="evt-hide-toggle"
                      title={ev.hidden ? 'Show this draw on the watch link' : 'Hide this draw from the watch link'}
                      onClick={() => onToggleHidden(i)}
                    >
                      {ev.hidden ? '🙈' : '👁'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <>
          <button type="button" className="btn small secondary evt-edit" title="Edit this event's category / gender / type" onClick={() => onEdit(active)}>✎</button>
          <button type="button" className="btn small secondary evt-edit" title="Add a new event" onClick={onAddClick}>+</button>
        </>
      )}
    </div>
  );
}
