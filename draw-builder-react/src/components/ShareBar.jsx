import { useState } from 'react';

const STATUS_LABEL = {
  connecting: 'Connecting…',
  synced: 'Live',
  error: 'Sync error — retrying',
  offline: 'Offline — saved locally',
  local: 'This device only',
};

const STATUS_TITLE = {
  local: 'Cloud sync is not configured — this tournament only exists on this device/browser.',
  offline: "No internet connection right now. Your changes are saved on this device and will sync automatically once you're back online.",
  error: 'Could not reach the server. Your changes are saved on this device and will keep retrying automatically.',
};

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    prompt('Copy this link:', text);
    return false;
  }
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function ShareBar({ status, editorName = '', onChangeName, editors = [], myEditorId }) {
  const [copied, setCopied] = useState(null); // null | 'edit' | 'watch'
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(editorName);

  const others = editors.filter((e) => e.editorId !== myEditorId);

  function flash(kind) {
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }

  async function copyEditLink() {
    await copyToClipboard(window.location.href);
    flash('edit');
  }

  async function copyWatchLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'watch');
    await copyToClipboard(url.toString());
    flash('watch');
  }

  function saveName() {
    onChangeName(nameDraft);
    setEditingName(false);
  }

  return (
    <div className="share-bar" title={STATUS_TITLE[status]}>
      <span className={'sync-dot sync-' + status} />
      <span className="sync-label">{STATUS_LABEL[status] || status}</span>
      {status !== 'local' && (
        <>
          {editingName ? (
            <input
              className="editor-name-input"
              autoFocus
              value={nameDraft}
              placeholder="Your name"
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            />
          ) : (
            <button
              type="button"
              className="btn small secondary"
              onClick={() => { setNameDraft(editorName); setEditingName(true); }}
              title="Set your name so other editors know who's making changes"
            >
              {editorName ? `You: ${editorName}` : 'Set your name'}
            </button>
          )}

          {others.length > 0 && (
            <span className="editors-present" title={`Also editing now: ${others.map((e) => e.name).join(', ')}`}>
              {others.slice(0, 4).map((e) => (
                <span className="editor-avatar" key={e.editorId}>{initials(e.name)}</span>
              ))}
              {others.length > 4 && <span className="editor-avatar editor-avatar-more">+{others.length - 4}</span>}
              <span className="editors-present-label">also editing</span>
            </span>
          )}

          <button type="button" className="btn small secondary" onClick={copyEditLink} title="Link for organizers — full editing access">
            {copied === 'edit' ? 'Copied!' : 'Copy edit link'}
          </button>
          <button type="button" className="btn small secondary" onClick={copyWatchLink} title="Link for players/parents — view only, no editing">
            {copied === 'watch' ? 'Copied!' : 'Copy watch link'}
          </button>
        </>
      )}
    </div>
  );
}
