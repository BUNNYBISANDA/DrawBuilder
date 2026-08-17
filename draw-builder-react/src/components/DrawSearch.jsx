export default function DrawSearch({ value, onChange, matchCount, focusIndex, onFocusIndexChange }) {
  const hasQuery = value.trim().length > 0;

  function step(delta) {
    if (!matchCount) return;
    onFocusIndexChange(((focusIndex + delta) % matchCount + matchCount) % matchCount);
  }

  return (
    <div className="draw-search">
      <input
        type="search"
        className="draw-search-input"
        placeholder="Find a player…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
        }}
      />
      {hasQuery && (
        <span className="draw-search-count">
          {matchCount ? `${focusIndex + 1}/${matchCount}` : 'No match'}
        </span>
      )}
      {hasQuery && matchCount > 1 && (
        <div className="draw-search-nav">
          <button type="button" className="btn small secondary" onClick={() => step(-1)} title="Previous match">↑</button>
          <button type="button" className="btn small secondary" onClick={() => step(1)} title="Next match">↓</button>
        </div>
      )}
    </div>
  );
}
