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

export default function ShareBar({ status }) {
  const [copied, setCopied] = useState(null); // null | 'edit' | 'watch'

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

  return (
    <div className="share-bar" title={STATUS_TITLE[status]}>
      <span className={'sync-dot sync-' + status} />
      <span className="sync-label">{STATUS_LABEL[status] || status}</span>
      {status !== 'local' && (
        <>
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
