import { useEffect, useRef, useState } from 'react';
import EventTabs from './components/EventTabs';
import BracketView from './components/BracketView';
import SchedulerView from './components/SchedulerView';
import { supabaseEnabled } from './utils/supabase';
import { getTournamentIdFromUrl, loadTournament, subscribeTournament } from './utils/tournamentSync';
import { DEFAULT_EVENTS, ensureEventShape } from './utils/eventShape';

export default function PublicView() {
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [active, setActive] = useState(0);
  const [view, setView] = useState('bracket');
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState('loading'); // loading | ready | not-found | disabled
  const canvasRef = useRef(null);

  const tournamentId = getTournamentIdFromUrl();

  useEffect(() => {
    if (!supabaseEnabled || !tournamentId) { setStatus('disabled'); return; }
    let cancelled = false;
    loadTournament(tournamentId)
      .then((remote) => {
        if (cancelled) return;
        if (!remote) { setStatus('not-found'); return; }
        setEvents(remote.events?.length ? remote.events.map(ensureEventShape) : DEFAULT_EVENTS);
        setActive(remote.active || 0);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('not-found'); });
    return () => { cancelled = true; };
  }, [tournamentId]);

  useEffect(() => {
    if (!supabaseEnabled || !tournamentId || status === 'disabled') return;
    return subscribeTournament(tournamentId, (remote) => {
      setEvents(remote.events?.length ? remote.events.map(ensureEventShape) : DEFAULT_EVENTS);
      setActive(remote.active || 0);
    });
  }, [tournamentId, status]);

  if (status === 'disabled') {
    return (
      <div className="public-message">
        <h2>Live viewing isn't available</h2>
        <p>This link is missing a tournament, or live sync isn't set up. Ask the organizer for the correct "watch" link.</p>
      </div>
    );
  }
  if (status === 'not-found') {
    return (
      <div className="public-message">
        <h2>Tournament not found</h2>
        <p>This link doesn't point to a tournament that exists. Ask the organizer to re-share the current link.</p>
      </div>
    );
  }
  if (status === 'loading') {
    return <div className="public-message"><h2>Loading tournament…</h2></div>;
  }

  const event = ensureEventShape(events[active] || DEFAULT_EVENTS[0]);
  const byes = event.bracket ? event.bracket.size - event.bracket.entrants : 0;

  return (
    <>
      <header className="public-header">
        <div>
          <h1>{event.name}</h1>
          <div className="sub">Galle Zonal — live draw &amp; schedule, view only</div>
        </div>
        <div className="spacer" />
        <span className="sync-dot sync-synced" title="Live" />
        <EventTabs events={events} active={active} onSelect={setActive} readOnly />
      </header>

      <section className="stage public-stage">
        {!event.bracket ? (
          <div className="empty">
            <h3>No draw published yet</h3>
            <p>Check back once the organizer generates the bracket for this event.</p>
          </div>
        ) : (
          <>
            <div className="stage-top">
              <span className="chip">Draw size <b>{event.bracket.size}</b> · entries <b>{event.bracket.entrants}</b></span>
              <span className="chip">{byes ? <>Byes <b>{byes}</b></> : 'No byes'}</span>
              <div className="stage-actions">
                <div className="view-toggle">
                  <button className={'btn small secondary' + (view === 'bracket' ? ' active' : '')} onClick={() => setView('bracket')}>Draw</button>
                  <button className={'btn small secondary' + (view === 'scheduler' ? ' active' : '')} onClick={() => setView('scheduler')}>Schedule</button>
                </div>
                {view === 'bracket' && (
                  <div className="zoom">
                    <button className="btn small secondary" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>-</button>
                    <span className="chip"><b>{Math.round(zoom * 100)}%</b></span>
                    <button className="btn small secondary" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>+</button>
                  </div>
                )}
              </div>
            </div>
            {view === 'bracket' ? (
              <BracketView bracket={event.bracket} zoom={zoom} canvasRef={canvasRef} readOnly />
            ) : (
              <SchedulerView bracket={event.bracket} readOnly />
            )}
          </>
        )}
      </section>
    </>
  );
}
