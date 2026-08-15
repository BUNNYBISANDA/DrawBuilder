export default function EventTabs({ events, active, onSelect, onRename, onAdd }) {
  return (
    <nav className="evt-tabs">
      {events.map((ev, i) => (
        <button
          key={i}
          className={'evt-tab' + (i === active ? ' active' : '')}
          onClick={() => onSelect(i)}
          onDoubleClick={() => {
            const n = prompt('Rename event', ev.name);
            if (n) onRename(i, n.trim());
          }}
        >
          {ev.name}
        </button>
      ))}
      <button
        className="evt-tab add"
        onClick={() => {
          const n = prompt('Event name (e.g. Mixed Doubles, U17 Boys Singles)');
          if (n) onAdd(n.trim());
        }}
      >
        + Event
      </button>
    </nav>
  );
}
