import { useEffect, useRef, useState } from 'react';
import EventTabs from './components/EventTabs';
import EventModal from './components/EventModal';
import ImportPanel from './components/ImportPanel';
import EntriesPanel from './components/EntriesPanel';
import BracketView from './components/BracketView';
import SchedulerView from './components/SchedulerView';
import { normalizeName, updateSeedName } from './utils/names';
import { buildBracket, samePlayer, clearDownstream, propagateRename, ensureMatches, emptyMatch } from './utils/bracket';
import { exportBracketPdf } from './utils/pdfExport';
import { loadState, saveState } from './utils/storage';

const DEFAULT_EVENTS = [
  { name: 'Singles', category: '', gender: '', type: 'Singles', players: [], seeds: [], drawSize: 'auto', customByes: [], bracket: null },
  { name: 'Doubles', category: '', gender: '', type: 'Doubles', players: [], seeds: [], drawSize: 'auto', customByes: [], bracket: null },
];

function ensureEventShape(ev) {
  return {
    name: ev.name || 'Event',
    nameOverride: ev.nameOverride || '',
    category: ev.category || '',
    gender: ev.gender || '',
    type: ev.type || 'Singles',
    players: Array.isArray(ev.players) ? ev.players : [],
    seeds: Array.isArray(ev.seeds) ? ev.seeds : [],
    drawSize: ev.drawSize || 'auto',
    customByes: Array.isArray(ev.customByes) ? ev.customByes : [],
    bracket: ev.bracket || null,
  };
}

export default function App() {
  const saved = loadState();
  const [events, setEvents] = useState(() => (saved?.events?.length ? saved.events.map(ensureEventShape) : DEFAULT_EVENTS));
  const [active, setActive] = useState(saved?.active || 0);
  const [zoom, setZoom] = useState(1);
  const [moveByes, setMoveByes] = useState(false);
  const [swapSlot, setSwapSlot] = useState(null);
  const [genStatus, setGenStatus] = useState({ msg: '', cls: '' });
  const [exportNote, setExportNote] = useState('32 slots per page');
  const [exportCls, setExportCls] = useState('');
  const [view, setView] = useState('bracket');
  const [eventModal, setEventModal] = useState(null); // null | 'add' | eventIndex (number) for edit
  const canvasRef = useRef(null);

  const event = ensureEventShape(events[active] || DEFAULT_EVENTS[0]);

  useEffect(() => {
    saveState({ events, active });
  }, [events, active]);

  function updateEvent(mutator) {
    setEvents((prev) => {
      const next = [...prev];
      next[active] = mutator(ensureEventShape(next[active]));
      return next;
    });
  }

  function addNames(names) {
    let added = 0;
    setEvents((prev) => {
      const next = [...prev];
      const ev = ensureEventShape(next[active]);
      const seen = new Set(ev.players.map((p) => p.toLowerCase()));
      const players = [...ev.players];
      names.forEach((n) => {
        const v = n.trim();
        if (v && !seen.has(v.toLowerCase())) {
          players.push(v);
          seen.add(v.toLowerCase());
          added++;
        }
      });
      next[active] = { ...ev, players, bracket: added ? null : ev.bracket };
      return next;
    });
    return added;
  }

  function clearAllEntries() {
    updateEvent((ev) => ({ ...ev, players: [], seeds: [], customByes: [], bracket: null }));
  }

  function generate() {
    const result = buildBracket(event);
    if (result.error) {
      setGenStatus({ msg: result.error, cls: 'err' });
      return;
    }
    updateEvent((ev) => ({ ...ev, bracket: result.bracket }));
    setMoveByes(false);
    setSwapSlot(null);

    const p = result.pinResult;
    if (p.invalid.length || p.taken.length) {
      const parts = [];
      if (p.invalid.length) parts.push(`pinned line out of range for ${p.invalid.slice(0, 3).join(', ')}`);
      if (p.taken.length) parts.push(`pinned line already taken for ${p.taken.slice(0, 3).join(', ')}`);
      setGenStatus({ msg: `Some seed lines couldn't be placed as pinned — ${parts.join('; ')}.`, cls: 'err' });
      return;
    }

    const byeCount = result.bracket.size - result.bracket.entrants;
    const r = result.byeResult;
    if (!event.customByes.length) {
      setGenStatus({ msg: byeCount ? `${byeCount} BYE${byeCount === 1 ? '' : 's'} filled after entries in paper order.` : 'No BYEs needed.', cls: '' });
    } else if (!byeCount) {
      setGenStatus({ msg: 'This draw has no BYEs. Custom BYE lines were ignored.', cls: 'err' });
    } else if (r.invalid.length) {
      setGenStatus({ msg: `Invalid BYE lines for ${result.bracket.size} draw: ${r.invalid.slice(0, 5).join(', ')}`, cls: 'err' });
    } else if (r.skipped.length) {
      setGenStatus({ msg: `Custom BYE lines skipped (occupied by seeded players): ${r.skipped.slice(0, 5).join(', ')}`, cls: 'err' });
    } else if (r.extra) {
      setGenStatus({ msg: `Applied ${r.applied} custom BYEs. Extra BYE lines ignored.`, cls: 'err' });
    } else {
      setGenStatus({ msg: `Applied ${r.applied} custom BYEs. ${byeCount - r.applied} auto-filled.`, cls: '' });
    }
  }

  function advance(r, i) {
    const br = event.bracket;
    if (!br) return;
    const cell = br.rounds[r][i];
    if (!cell || cell.bye) return;
    const nextI = i >> 1;
    const existing = br.rounds[r + 1][nextI];
    if (samePlayer(existing, cell) && !confirm('Remove ' + (cell.seed ? `${cell.name} (${cell.seed})` : cell.name) + ' from the next round?')) {
      return;
    }
    updateEvent((ev) => {
      const next = structuredClone(ev.bracket);
      if (samePlayer(existing, cell)) {
        clearDownstream(next, r + 1, nextI, cell);
      } else {
        const nextExisting = next.rounds[r + 1][nextI];
        if (nextExisting) clearDownstream(next, r + 1, nextI, nextExisting);
        next.rounds[r + 1][nextI] = { ...cell };
      }
      return { ...ev, bracket: next };
    });
  }

  function handleSwapClick(i) {
    if (swapSlot === null) {
      setSwapSlot(i);
      return;
    }
    if (swapSlot === i) {
      setSwapSlot(null);
      return;
    }
    updateEvent((ev) => {
      const next = structuredClone(ev.bracket);
      next.matches = ensureMatches(next);
      [next.rounds[0][swapSlot], next.rounds[0][i]] = [next.rounds[0][i], next.rounds[0][swapSlot]];
      for (let r = 1; r < next.rounds.length; r++) next.rounds[r].fill(null);
      for (let m = 0; m < next.size / 2; m++) {
        const a = next.rounds[0][2 * m], b = next.rounds[0][2 * m + 1];
        if (a && b && a.bye && !b.bye) next.rounds[1][m] = { ...b };
        if (a && b && b.bye && !a.bye) next.rounds[1][m] = { ...a };
      }
      // The two round-1 matches involved just changed players — their
      // recorded score/court/time no longer refers to the same pairing.
      next.matches[0][swapSlot >> 1] = emptyMatch();
      next.matches[0][i >> 1] = emptyMatch();
      return { ...ev, bracket: next };
    });
    setSwapSlot(null);
  }

  function updateMatch(r, m, patch) {
    updateEvent((ev) => {
      const next = structuredClone(ev.bracket);
      next.matches = ensureMatches(next);
      next.matches[r][m] = { ...next.matches[r][m], ...patch };
      return { ...ev, bracket: next };
    });
  }

  function renameCell(cell, text) {
    const v = text.replace(/\s*\(\d+\)\s*$/, '').trim();
    if (!v) return;
    updateEvent((ev) => {
      const nextBracket = structuredClone(ev.bracket);
      propagateRename(nextBracket, cell.entryNo, v);
      const players = [...ev.players];
      players[cell.entryNo - 1] = v;
      const seeds = cell.seed ? updateSeedName(ev.seeds, cell.seed - 1, v) : ev.seeds;
      return { ...ev, players, seeds, bracket: nextBracket };
    });
  }

  async function doExportPdf() {
    if (!canvasRef.current || !event.bracket) {
      setExportNote('generate bracket first');
      setExportCls('err');
      return;
    }
    await exportBracketPdf(canvasRef.current, event.bracket, event.name + '-draw', (msg, cls = '') => {
      setExportNote(msg);
      setExportCls(cls);
    });
  }

  const byes = event.bracket ? event.bracket.size - event.bracket.entrants : 0;
  const seededCount = event.bracket ? event.bracket.rounds[0].filter((c) => c && c.seed).length : 0;

  return (
    <>
      <header>
        <svg className="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="11" cy="29" r="5.5" fill="#D2622A" />
          <path d="M15 25 33 7M20 30l11-11M15 25l3 3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <div>
          <h1>Badminton draw builder</h1>
          <div className="sub">Upload a list, generate the knockout draw, edit everything.</div>
        </div>
        <div className="spacer" />
        <EventTabs
          events={events}
          active={active}
          onSelect={(i) => { setActive(i); setSwapSlot(null); setMoveByes(false); setView('bracket'); }}
          onEdit={(i) => setEventModal(i)}
          onAddClick={() => setEventModal('add')}
        />
      </header>

      {eventModal !== null && (
        <EventModal
          initial={eventModal === 'add' ? null : ensureEventShape(events[eventModal])}
          onClose={() => setEventModal(null)}
          onSave={(meta) => {
            if (eventModal === 'add') {
              setEvents((prev) => [...prev, { ...meta, players: [], seeds: [], drawSize: 'auto', customByes: [], bracket: null }]);
              setActive(events.length);
            } else {
              setEvents((prev) => {
                const next = [...prev];
                next[eventModal] = { ...ensureEventShape(next[eventModal]), ...meta };
                return next;
              });
            }
            setEventModal(null);
          }}
        />
      )}

      <main>
        <aside>
          <ImportPanel onAddNames={addNames} onClearAll={clearAllEntries} />
          <EntriesPanel
            event={event}
            onUpdateEvent={updateEvent}
            onGenerate={generate}
            onExportPdf={doExportPdf}
          />
          {genStatus.msg ? <div className={'status ' + genStatus.cls} style={{ padding: '0 18px 12px' }}>{genStatus.msg}</div> : null}
        </aside>

        <section className="stage">
          <div className="stage-top">
            <h2>{event.name} draw</h2>
            {event.bracket ? (
              <>
                <span className="chip">Draw size <b>{event.bracket.size}</b> · entries <b>{event.bracket.entrants}</b></span>
                <span className="chip">{byes ? <>Byes <b>{byes}</b></> : 'No byes'}</span>
                <span className={'chip' + (seededCount ? ' chip-warn' : '')}>
                  {seededCount ? <>Seeded draw · <b>{seededCount}</b> seed{seededCount === 1 ? '' : 's'} placed</> : 'Unseeded — straight paper order'}
                </span>
              </>
            ) : null}
            <div className="stage-actions">
              {event.bracket && (
                <div className="view-toggle">
                  <button className={'btn small secondary' + (view === 'bracket' ? ' active' : '')} onClick={() => setView('bracket')}>Bracket</button>
                  <button className={'btn small secondary' + (view === 'scheduler' ? ' active' : '')} onClick={() => setView('scheduler')}>Scheduler</button>
                </div>
              )}
              {view === 'bracket' && (
                <div className="zoom">
                  <button className="btn small secondary" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>-</button>
                  <span className="chip"><b>{Math.round(zoom * 100)}%</b></span>
                  <button className="btn small secondary" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>+</button>
                </div>
              )}
              {view === 'bracket' && (
                <button
                  className={'btn small secondary toggle' + (moveByes && event.bracket ? ' active' : '')}
                  disabled={!event.bracket}
                  title="Click two round-1 slots to swap players and BYEs."
                  onClick={() => { setMoveByes((v) => !v); setSwapSlot(null); }}
                >
                  {moveByes && event.bracket ? (swapSlot === null ? 'Move BYEs: pick slot' : 'Move BYEs: pick target') : 'Move BYEs'}
                </button>
              )}
              <button className="btn small export" title="Downloads a bracket-only PDF. Each page contains up to 32 bracket slots." onClick={doExportPdf}>Export PDF</button>
              <span className={'export-note ' + exportCls}>{exportNote}</span>
            </div>
          </div>

          <div className="export-strip">
            <button className="btn export" title="Downloads only the bracket as a PDF. Each page contains up to 32 bracket slots." onClick={doExportPdf}>Export PDF</button>
            <span className={'export-note ' + exportCls}>{exportNote}</span>
          </div>

          {view === 'bracket' && (
            <p className="hint">Choose draw size and custom BYE lines on the left. After generating, Move BYEs can still swap two round-1 slots if you need a quick adjustment.</p>
          )}
          {view === 'scheduler' && (
            <p className="hint">Assign a court, a scheduled time, and record set scores for every real match. BYE lines have nothing to schedule.</p>
          )}

          {!event.bracket ? (
            <div className="empty">
              <h3>No draw yet</h3>
              <p>Import entries, choose draw size, optionally type custom BYE line numbers, then press <b>Generate bracket</b>.<br />Example: 16 entries can be generated as a 32 draw with BYEs on the lines you choose.</p>
            </div>
          ) : view === 'scheduler' ? (
            <SchedulerView bracket={event.bracket} onUpdateMatch={updateMatch} />
          ) : (
            <>
              <BracketView
                bracket={event.bracket}
                moveByes={moveByes}
                swapSlot={swapSlot}
                zoom={zoom}
                onAdvance={advance}
                onSwapClick={handleSwapClick}
                onRenameCell={renameCell}
                canvasRef={canvasRef}
              />
              <p className="footer-note">
                {moveByes
                  ? 'Move BYEs mode: click one round-1 slot, then another round-1 slot to swap them. Results reset after each swap.'
                  : 'BYEs auto-advance their opponent. Champion appears in the orange box.'}
              </p>
            </>
          )}
        </section>
      </main>
    </>
  );
}
