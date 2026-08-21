import { useEffect, useState } from 'react';
import Footer from './components/Footer';
import { listMyTournaments, createTournament, renameTournament } from './utils/tournamentSync';
import { signOut } from './utils/auth';
import { DEFAULT_EVENTS } from './utils/eventShape';

function watchLink(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('t', id);
  url.searchParams.set('view', 'watch');
  return url.toString();
}
function editLink(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('t', id);
  url.searchParams.delete('view');
  return url.toString();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    prompt('Copy this link:', text);
    return false;
  }
}

export default function Dashboard({ user }) {
  const [tournaments, setTournaments] = useState(null); // null = loading
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    listMyTournaments(user.id)
      .then((rows) => { if (!cancelled) setTournaments(rows); })
      .catch((err) => { if (!cancelled) { setError(err.message || 'Could not load your tournaments.'); setTournaments([]); } });
    return () => { cancelled = true; };
  }, [user.id]);

  async function createNew(e) {
    e.preventDefault();
    const name = newName.trim() || 'Untitled tournament';
    setCreating(true);
    setError('');
    try {
      const id = await createTournament({ events: DEFAULT_EVENTS, active: 0, notices: [] }, user.id, name);
      window.location.href = editLink(id);
    } catch (err) {
      setError(err.message || 'Could not create the tournament.');
      setCreating(false);
    }
  }

  async function copyWatch(id) {
    await copyToClipboard(watchLink(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  function startRename(t) {
    setRenamingId(t.id);
    setRenameDraft(t.name || '');
  }

  async function saveRename(id) {
    const name = renameDraft.trim() || 'Untitled tournament';
    setRenamingId(null);
    setTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
    try {
      await renameTournament(id, name);
    } catch (err) {
      setError(err.message || 'Could not rename the tournament.');
    }
  }

  return (
    <>
      <header>
        <div>
          <h1>Your tournaments</h1>
          <div className="sub">Signed in as {user.email}</div>
        </div>
        <div className="spacer" />
        <button type="button" className="btn small secondary" onClick={() => signOut()}>Log out</button>
      </header>

      <section className="dashboard">
        {error && <div className="status err" style={{ marginBottom: 12 }}>{error}</div>}

        <form className="dashboard-new" onSubmit={createNew}>
          <input
            className="modal-input"
            placeholder="New tournament name, e.g. Galle Zonal 2027"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="btn" disabled={creating}>{creating ? 'Creating…' : '+ New tournament'}</button>
        </form>

        {tournaments === null ? (
          <p className="hint">Loading your tournaments…</p>
        ) : !tournaments.length ? (
          <div className="empty">
            <h3>No tournaments yet</h3>
            <p>Create your first one above to get started. Already have an edit link from before accounts existed? Open it while signed in and it'll be added to your list automatically.</p>
          </div>
        ) : (
          <div className="dashboard-list">
            {tournaments.map((t) => {
              const eventCount = t.data?.events?.length || 0;
              return (
                <div className="dashboard-row" key={t.id}>
                  <div className="dashboard-row-main">
                    {renamingId === t.id ? (
                      <input
                        className="modal-input dashboard-rename-input"
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => saveRename(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="dashboard-row-name dashboard-row-name-btn"
                        title="Rename this tournament"
                        onClick={() => startRename(t)}
                      >
                        {t.name || 'Untitled tournament'} <span className="dashboard-rename-icon">✎</span>
                      </button>
                    )}
                    <div className="dashboard-row-meta">{eventCount} event{eventCount === 1 ? '' : 's'} · updated {new Date(t.updated_at).toLocaleDateString()}</div>
                  </div>
                  <div className="dashboard-row-actions">
                    <a className="btn small secondary" href={editLink(t.id)}>Go to tournament</a>
                    <button type="button" className="btn small secondary" onClick={() => copyWatch(t.id)}>
                      {copiedId === t.id ? 'Copied!' : 'Copy watch link'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <Footer />
    </>
  );
}
