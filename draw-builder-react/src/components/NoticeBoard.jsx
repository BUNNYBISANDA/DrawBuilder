import { useState } from 'react';
import { newNotice } from '../utils/notices';

// Tournament-wide announcements — shown above every event, for the whole
// tournament this ?t= link points to. readOnly renders the same board with
// no controls, for the public watch link.
export default function NoticeBoard({ notices, onChange, readOnly }) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  if (readOnly) {
    if (!notices.length) return null;
    return (
      <div className="notice-board">
        {notices.map((n) => (
          <div className="notice-card" key={n.id}>
            <span className="notice-icon">📢</span>
            <p className="notice-text">{n.text}</p>
          </div>
        ))}
      </div>
    );
  }

  function addNotice() {
    const text = draft.trim();
    if (!text) return;
    onChange([...notices, newNotice(text)]);
    setDraft('');
  }

  function removeNotice(id) {
    onChange(notices.filter((n) => n.id !== id));
  }

  return (
    <div className={'notice-board notice-board-editable' + (open ? ' open' : '')}>
      <button type="button" className="notice-board-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="notice-board-toggle-label">📢 Notices <span className="school-bar-scope">for the whole tournament</span></span>
        <span className="notice-board-toggle-count">{notices.length ? `${notices.length} posted` : 'None posted'}</span>
        <span className="school-bar-caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="notice-board-panel">
          {notices.map((n) => (
            <div className="notice-card" key={n.id}>
              <span className="notice-icon">📢</span>
              <p className="notice-text">{n.text}</p>
              <button type="button" className="notice-remove" title="Remove this notice" onClick={() => removeNotice(n.id)}>✕</button>
            </div>
          ))}
          <div className="notice-add">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write an announcement for everyone watching this tournament (schedule changes, venue notes, etc.)…"
            />
            <button type="button" className="btn small" onClick={addNotice} disabled={!draft.trim()}>+ Post notice</button>
          </div>
        </div>
      )}
    </div>
  );
}
