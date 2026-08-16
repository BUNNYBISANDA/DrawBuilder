import { useState } from 'react';

export default function ImportPanel({ onAddNames, onClearAll, existingPlayers }) {
  const [status, setStatus] = useState({ msg: '', cls: '' });
  const [pasteText, setPasteText] = useState('');
  const [pending, setPending] = useState(null); // { unique, duplicates } awaiting confirmation

  const setStat = (msg, cls = '') => setStatus({ msg, cls });

  function checkDuplicates() {
    const lines = pasteText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) {
      setStat('Nothing to add — paste one name per line.', 'err');
      return;
    }
    const seen = new Set(existingPlayers.map((p) => p.toLowerCase()));
    const unique = [];
    const duplicates = [];
    lines.forEach((v) => {
      const key = v.toLowerCase();
      if (seen.has(key)) { duplicates.push(v); return; }
      seen.add(key);
      unique.push(v);
    });

    if (duplicates.length) {
      setPending({ unique, duplicates });
      setStat('', '');
      return;
    }
    commit(unique);
  }

  function commit(names) {
    const { added } = onAddNames(names);
    setStat(`Added ${added} name${added === 1 ? '' : 's'}.`);
    setPasteText('');
    setPending(null);
  }

  return (
    <section className="panel">
      <h2><span className="n">1</span> Add players</h2>
      <textarea
        value={pasteText}
        onChange={(e) => { setPasteText(e.target.value); setPending(null); }}
        placeholder={'One player (or pair) per line\nSomchai P.\nBunny J.\nArisa / Mook'}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={checkDuplicates}>Add names</button>
        <button className="btn secondary" onClick={() => { onClearAll(); setPending(null); setStat('List cleared.'); }}>Clear list</button>
      </div>

      {pending ? (
        <div className="dupe-warning">
          <p>
            <b>{pending.duplicates.length}</b> name{pending.duplicates.length === 1 ? '' : 's'} already in the list, so nothing was added yet: {pending.duplicates.join(', ')}
          </p>
          <div className="row" style={{ marginTop: 6 }}>
            {pending.unique.length > 0 && (
              <button className="btn small" onClick={() => commit(pending.unique)}>
                Add the other {pending.unique.length} name{pending.unique.length === 1 ? '' : 's'}
              </button>
            )}
            <button className="btn small secondary" onClick={() => setPending(null)}>Cancel, let me edit</button>
          </div>
        </div>
      ) : (
        <div className={'status ' + status.cls}>{status.msg}</div>
      )}
    </section>
  );
}
