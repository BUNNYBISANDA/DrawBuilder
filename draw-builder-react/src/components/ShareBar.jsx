import { useState } from 'react';

const STATUS_LABEL = {
  connecting: 'Connecting…',
  synced: 'Live',
  error: 'Sync error',
  local: 'This device only',
};

export default function ShareBar({ status }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt('Copy this link to share the live tournament:', window.location.href);
    }
  }

  return (
    <div className="share-bar" title={status === 'local' ? 'Cloud sync is not configured — this tournament only exists on this device/browser.' : undefined}>
      <span className={'sync-dot sync-' + status} />
      <span className="sync-label">{STATUS_LABEL[status] || status}</span>
      {status !== 'local' && (
        <button type="button" className="btn small secondary" onClick={copyLink}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      )}
    </div>
  );
}
