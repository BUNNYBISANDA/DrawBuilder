import { useEffect, useRef, useState } from 'react';
import EventTabs from './components/EventTabs';
import Footer from './components/Footer';
import EventModal from './components/EventModal';
import ShareBar from './components/ShareBar';
import ImportPanel from './components/ImportPanel';
import EntriesPanel from './components/EntriesPanel';
import BracketView from './components/BracketView';
import SchedulerView from './components/SchedulerView';
import DrawSearch from './components/DrawSearch';
import MatchProgress from './components/MatchProgress';
import SchoolStandings from './components/SchoolStandings';
import { normalizeName, updateSeedName } from './utils/names';
import { buildBracket, samePlayer, clearDownstream, propagateRename, ensureMatches, emptyMatch, countSearchMatches } from './utils/bracket';
import { exportBracketPdf } from './utils/pdfExport';
import { loadState, saveState } from './utils/storage';
import { supabaseEnabled } from './utils/supabase';
import {
  getTournamentIdFromUrl, setTournamentIdInUrl,
  createTournament, loadTournament, saveTournament, subscribeTournament, subscribePresence,
  claimTournament,
} from './utils/tournamentSync';
import { signOut } from './utils/auth';
import { getEditorId, getEditorName, setEditorName } from './utils/editorIdentity';
import { DEFAULT_EVENTS, ensureEventShape } from './utils/eventShape';
import { ensureNotices } from './utils/notices';
import NoticeBoard from './components/NoticeBoard';
import ThemeToggle from './components/ThemeToggle';
import { IconWarning, IconInfo, IconClose, IconEye, IconEyeOff, IconShuttlecock } from './components/Icon';

export default function App({ user }) {
  const saved = loadState();
  const [events, setEvents] = useState(() => (saved?.events?.length ? saved.events.map(ensureEventShape) : DEFAULT_EVENTS));
  const [active, setActive] = useState(saved?.active || 0);
  const [notices, setNotices] = useState(() => ensureNotices(saved?.notices));
  // Set once we learn this tournament belongs to a different account —
  // blocks the editor and shows an access-denied screen instead.
  const [accessDenied, setAccessDenied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [moveByes, setMoveByes] = useState(false);
  const [swapSlot, setSwapSlot] = useState(null);
  const [genStatus, setGenStatus] = useState({ msg: '', cls: '' });
  const [exportNote, setExportNote] = useState('32 slots per page');
  const [exportCls, setExportCls] = useState('');
  const [view, setView] = useState('bracket');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocus, setSearchFocus] = useState(0);
  const [eventModal, setEventModal] = useState(null); // null | 'add' | eventIndex (number) for edit
  const [tournamentId, setTournamentId] = useState(null);
  const [syncStatus, setSyncStatus] = useState(supabaseEnabled ? 'connecting' : 'local'); // 'local' | 'connecting' | 'synced' | 'offline' | 'error'
  const canvasRef = useRef(null);
  const skipNextSave = useRef(false);
  const saveTimer = useRef(null);
  const retryTimer = useRef(null);
  // Local edits that haven't reached the server yet (dropped connection, failed
  // request, ...). Every change is written to localStorage first regardless —
  // this flag just tracks whether the cloud copy still needs to catch up.
  const pendingSyncRef = useRef(!!saved?.pendingSync);
  // Indices into `events` that have local changes not yet confirmed synced.
  // Used to merge incoming updates per-event instead of overwriting the whole
  // array, so two organizers editing two different events never stomp each
  // other. If we reloaded with unsynced changes from last time, we don't know
  // which specific event(s) they touched — assume all of them until our
  // pending push confirms, rather than risk silently discarding an edit.
  const dirtyIndexesRef = useRef(
    saved?.pendingSync && saved?.events?.length ? new Set(saved.events.map((_, i) => i)) : new Set()
  );
  // Notices aren't per-event, so they get one flag rather than a per-index
  // set — true whenever the local list has an edit not yet confirmed synced.
  const noticesDirtyRef = useRef(!!saved?.pendingSync);
  // Indices currently being typed into (focused, not yet blurred/committed).
  // Separate from dirtyIndexesRef: a field can be "being edited" without any
  // change having landed yet (e.g. just clicked in, or typed then undid it).
  // We still need to hold off remote overwrites the moment editing starts —
  // waiting for the first onChange would let an in-flight remote update land
  // between focus and that first keystroke and wipe out what's being typed.
  const editingIndexesRef = useRef(new Set());
  function beginFieldEdit() { editingIndexesRef.current.add(activeRef.current); }
  function endFieldEdit() { editingIndexesRef.current.delete(activeRef.current); }
  const eventsRef = useRef(events);
  const activeRef = useRef(active);
  const noticesRef = useRef(notices);
  useEffect(() => { eventsRef.current = events; activeRef.current = active; noticesRef.current = notices; }, [events, active, notices]);

  // Who's editing — a stable per-browser identity, used to tell "my own edit
  // echoing back" apart from a real change from someone else, and to show
  // everyone who currently has this tournament's edit link open.
  const editorIdRef = useRef(getEditorId());
  const [editorName, setEditorNameState] = useState(getEditorName());
  const [editors, setEditors] = useState([]);
  const [notice, setNotice] = useState(null); // { kind: 'info' | 'conflict', text }
  const noticeTimer = useRef(null);

  function showNotice(kind, text, autoDismissMs) {
    setNotice({ kind, text });
    clearTimeout(noticeTimer.current);
    if (autoDismissMs) noticeTimer.current = setTimeout(() => setNotice(null), autoDismissMs);
  }

  function changeEditorName(name) {
    setEditorNameState(setEditorName(name));
  }

  const event = ensureEventShape(events[active] || DEFAULT_EVENTS[0]);

  function scheduleRetry(id) {
    if (retryTimer.current) return;
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      if (!pendingSyncRef.current) return;
      pushToRemote(id, { events: eventsRef.current, active: activeRef.current, notices: noticesRef.current });
    }, 8000);
  }

  // Pushes to Supabase and, whatever happens, keeps localStorage as the
  // source of truth so a dropped connection never loses an edit — it just
  // waits (with retries) until the push finally goes through.
  async function pushToRemote(id, state) {
    // Snapshot which events were dirty as of this push — if a new edit lands
    // while the request is in flight, it stays marked dirty even after this
    // push succeeds, instead of being mistaken for already-synced.
    const dirtySnapshot = new Set(dirtyIndexesRef.current);
    const noticesWereDirty = noticesDirtyRef.current;
    try {
      // Re-fetch the freshest server copy right before writing, and only
      // overwrite the event(s) we actually changed ourselves. Without this,
      // a stale local copy of an event we never touched (e.g. a realtime
      // update we missed while this tab was backgrounded) would silently
      // revert someone else's edit to it the next time we save anything.
      let baseEvents = state.events;
      let baseNotices = state.notices;
      try {
        const latest = await loadTournament(id);
        const latestEvents = latest?.events?.length ? latest.events.map(ensureEventShape) : null;
        if (latestEvents && latestEvents.length === state.events.length) {
          baseEvents = latestEvents.map((ev, i) => (dirtySnapshot.has(i) ? state.events[i] : ev));
        }
        // Notices aren't per-event, so there's nothing to merge by index —
        // take the freshest remote list unless we have an unsynced local edit.
        if (!noticesWereDirty) baseNotices = ensureNotices(latest?.notices);
      } catch {
        // Reconciling read failed — fall back to writing our own copy rather
        // than giving up on the save entirely.
      }

      const payload = { events: baseEvents, active: state.active, notices: baseNotices, editor: editorName || 'An organizer', editorId: editorIdRef.current, editedAt: Date.now() };
      await saveTournament(id, payload);
      dirtySnapshot.forEach((i) => dirtyIndexesRef.current.delete(i));
      pendingSyncRef.current = dirtyIndexesRef.current.size > 0;
      if (noticesWereDirty) noticesDirtyRef.current = false;
      if (baseEvents !== state.events) {
        skipNextSave.current = true;
        setEvents(baseEvents);
      }
      if (baseNotices !== state.notices) {
        skipNextSave.current = true;
        setNotices(baseNotices);
      }
      saveState({ events: baseEvents, active: state.active, notices: baseNotices, pendingSync: pendingSyncRef.current, tournamentId: id });
      setSyncStatus('synced');
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    } catch (err) {
      console.error(err);
      pendingSyncRef.current = true;
      saveState({ events: state.events, active: state.active, notices: state.notices, pendingSync: true, tournamentId: id });
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      scheduleRetry(id);
    }
  }

  // One-time: join the tournament named in the URL, or start a new one.
  useEffect(() => {
    if (!supabaseEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const urlId = getTournamentIdFromUrl();
        // Fall back to the last tournament we touched on this device if the
        // URL lost its ?t= param (e.g. someone bookmarked the bare domain) —
        // otherwise we'd silently spin up a brand new, empty tournament.
        const knownId = urlId || saved?.tournamentId || null;

        if (knownId && pendingSyncRef.current) {
          // We have local edits that never made it to the server last time —
          // push them up instead of pulling remote, which could still be
          // missing those edits and would overwrite them on the way in.
          if (!urlId) setTournamentIdInUrl(knownId);
          setTournamentId(knownId);
          setSyncStatus(navigator.onLine ? 'connecting' : 'offline');
          await pushToRemote(knownId, { events: eventsRef.current, active: activeRef.current, notices: noticesRef.current });
          return;
        }

        if (knownId) {
          const remote = await loadTournament(knownId);
          if (remote) {
            if (cancelled) return;
            if (remote.ownerId && user && remote.ownerId !== user.id) {
              // Belongs to a different account — show the access-denied
              // screen instead of loading any of its data into the editor.
              setAccessDenied(true);
              setTournamentId(knownId);
              setSyncStatus('synced');
              return;
            }
            if (!remote.ownerId && user) {
              // A legacy link from before accounts existed — claim it for
              // whoever opens it first while signed in.
              claimTournament(knownId, user.id).catch((err) => console.error(err));
            }
            setEvents(remote.events?.length ? remote.events.map(ensureEventShape) : DEFAULT_EVENTS);
            setActive(remote.active || 0);
            setNotices(ensureNotices(remote.notices));
            setTournamentId(knownId);
            if (!urlId) setTournamentIdInUrl(knownId);
            setSyncStatus('synced');
            return;
          }
        }
        const id = await createTournament({ events, active, notices }, user?.id);
        setTournamentIdInUrl(id);
        if (!cancelled) { setTournamentId(id); setSyncStatus('synced'); }
      } catch (err) {
        console.error(err);
        if (!cancelled) setSyncStatus(navigator.onLine ? 'error' : 'offline');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live updates from other people viewing/editing the same tournament link.
  useEffect(() => {
    if (!supabaseEnabled || !tournamentId || accessDenied) return;
    return subscribeTournament(tournamentId, (remote) => {
      const fromSelf = remote.editorId && remote.editorId === editorIdRef.current;
      // "Ours to protect" covers both unsynced changes and fields currently
      // being typed into — otherwise a remote update landing mid-keystroke
      // (before the field is blurred/committed) would wipe it out even
      // though it was never actually in conflict.
      const isProtected = (i) => dirtyIndexesRef.current.has(i) || editingIndexesRef.current.has(i);
      const hadDirty = dirtyIndexesRef.current.size > 0 || editingIndexesRef.current.size > 0;
      const remoteEvents = remote.events?.length ? remote.events.map(ensureEventShape) : DEFAULT_EVENTS;
      const structural = remoteEvents.length !== eventsRef.current.length;
      const remoteNotices = ensureNotices(remote.notices);

      if (!fromSelf) {
        const who = remote.editor || 'Someone';
        if (hadDirty && structural) {
          // A genuine conflict: an event was added/removed elsewhere while we
          // still had unsynced changes, so a safe per-event merge isn't
          // possible here — flag it instead of silently picking a side.
          showNotice('conflict', `${who} added or removed an event while you had unsynced changes. Your local changes were kept for now — refresh once your edits have synced to make sure everything lines up.`, 0);
        } else if (hadDirty) {
          showNotice('info', `${who} updated another event. Your own changes are kept and will be sent automatically.`, 5000);
        } else {
          showNotice('info', `${who} updated the draw.`, 5000);
        }
      }

      setEvents((prevLocal) => {
        if (!hadDirty) {
          // Nothing of ours pending — the incoming snapshot is authoritative.
          return remoteEvents;
        }
        if (structural) {
          // Can't safely merge an added/removed event against our own
          // unsynced changes by index — leave our copy alone until our
          // pending push resolves, per the conflict notice above.
          return prevLocal;
        }
        // Merge per event: keep our own not-yet-synced (or actively being
        // typed into) event(s) exactly as they are locally, take theirs for
        // everything else. This is what lets two organizers edit two
        // different events at once without either side's screen jumping or
        // losing work.
        return prevLocal.map((localEv, i) => (isProtected(i) ? localEv : remoteEvents[i]));
      });
      if (!noticesDirtyRef.current) setNotices(remoteNotices);
      // Never adopt someone else's tab selection — switching events on one
      // laptop shouldn't switch the view on everyone else's.
      if (!hadDirty) skipNextSave.current = true;
    });
  }, [tournamentId]);

  // Presence: who else currently has this tournament's edit link open.
  useEffect(() => {
    if (!supabaseEnabled || !tournamentId) return;
    return subscribePresence(tournamentId, { editorId: editorIdRef.current, name: editorName || 'Organizer' }, setEditors);
  }, [tournamentId, editorName]);

  // Retry the moment the browser regains connectivity, instead of waiting
  // for the next edit (which may never come if the organizer just walks away).
  useEffect(() => {
    if (!supabaseEnabled) return;
    function onOnline() {
      if (pendingSyncRef.current && tournamentId) {
        pushToRemote(tournamentId, { events: eventsRef.current, active: activeRef.current, notices: noticesRef.current });
      }
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [tournamentId]);

  useEffect(() => {
    // Local save always happens first and immediately — this is the copy
    // that survives a dropped connection or a refresh mid-outage.
    saveState({ events, active, notices, pendingSync: pendingSyncRef.current, tournamentId });

    if (!supabaseEnabled || !tournamentId || accessDenied) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      pushToRemote(tournamentId, { events, active, notices });
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [events, active, notices, tournamentId, accessDenied]);

  function updateNotices(next) {
    noticesDirtyRef.current = true;
    setNotices(next);
  }

  function updateEvent(mutator) {
    dirtyIndexesRef.current.add(active);
    setEvents((prev) => {
      const next = [...prev];
      next[active] = mutator(ensureEventShape(next[active]));
      return next;
    });
  }

  function addNames(names) {
    let added = 0;
    const duplicates = [];
    dirtyIndexesRef.current.add(active);
    setEvents((prev) => {
      const next = [...prev];
      const ev = ensureEventShape(next[active]);
      const seen = new Set(ev.players.map((p) => p.toLowerCase()));
      const players = [...ev.players];
      names.forEach((n) => {
        const v = n.trim();
        if (!v) return;
        if (seen.has(v.toLowerCase())) {
          duplicates.push(v);
          return;
        }
        players.push(v);
        seen.add(v.toLowerCase());
        added++;
      });
      next[active] = { ...ev, players, bracket: added ? null : ev.bracket };
      return next;
    });
    return { added, duplicates };
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
        // Picking a winner means that match is over — flip its scheduler
        // status to Completed unless it was already given a final status.
        next.matches = ensureMatches(next);
        const m = next.matches[r][nextI];
        if (m.status !== 'completed' && m.status !== 'walkover' && m.status !== 'retired') {
          next.matches[r][nextI] = { ...m, status: 'completed' };
        }
      }
      return { ...ev, bracket: next };
    });
  }

  function clearAdvance(r, i) {
    const br = event.bracket;
    if (!br) return;
    const cell = br.rounds[r][i];
    if (!cell) return;
    updateEvent((ev) => {
      const next = structuredClone(ev.bracket);
      clearDownstream(next, r, i, cell);
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
  const searchMatchCount = event.bracket ? countSearchMatches(event.bracket, searchTerm) : 0;

  useEffect(() => { setSearchFocus(0); }, [searchTerm, active]);

  if (accessDenied) {
    return (
      <div className="public-message">
        <h2>This tournament belongs to another account</h2>
        <p>Ask the owner to share the watch link instead, or sign in as the account that created it.</p>
        <a className="btn" href="/">My tournaments</a>
      </div>
    );
  }

  return (
    <>
      <header>
        <div className="header-id">
          <span className="header-mark"><IconShuttlecock width={19} height={19} strokeWidth={2} /></span>
          <div>
            <h1>Galle Zonal Draw Builder</h1>
            <div className="sub">Tournament draws, schedules &amp; scores</div>
          </div>
        </div>
        <div className="spacer" />
        <ThemeToggle />
        {user && (
          <>
            <a className="btn small secondary" href="/" title="Back to your tournaments">← My tournaments</a>
            <button type="button" className="btn small secondary" onClick={() => signOut()} title={user.email}>Log out</button>
          </>
        )}
        <ShareBar
          status={syncStatus}
          editorName={editorName}
          onChangeName={changeEditorName}
          editors={editors}
          myEditorId={editorIdRef.current}
        />
        <EventTabs
          events={events}
          active={active}
          onSelect={(i) => { setActive(i); setSwapSlot(null); setMoveByes(false); setView('bracket'); setSearchTerm(''); }}
          onEdit={(i) => setEventModal(i)}
          onAddClick={() => setEventModal('add')}
          onToggleHidden={(i) => {
            dirtyIndexesRef.current.add(i);
            setEvents((prev) => {
              const next = [...prev];
              const ev = ensureEventShape(next[i]);
              next[i] = { ...ev, hidden: !ev.hidden };
              return next;
            });
          }}
        />
      </header>

      <NoticeBoard notices={notices} onChange={updateNotices} />
      <SchoolStandings bracket={event.bracket} />

      {notice && (
        <div className={'edit-notice ' + (notice.kind === 'conflict' ? 'edit-notice-conflict' : 'edit-notice-info')}>
          <span className="edit-notice-body">
            {notice.kind === 'conflict' ? <IconWarning width={15} height={15} /> : <IconInfo width={15} height={15} />}
            {notice.text}
          </span>
          <button type="button" className="edit-notice-close" onClick={() => setNotice(null)} title="Dismiss"><IconClose width={13} height={13} /></button>
        </div>
      )}

      {eventModal !== null && (
        <EventModal
          initial={eventModal === 'add' ? null : ensureEventShape(events[eventModal])}
          onClose={() => setEventModal(null)}
          onSave={(meta) => {
            if (eventModal === 'add') {
              setEvents((prev) => [...prev, { ...meta, players: [], seeds: [], drawSize: 'auto', customByes: [], bracket: null }]);
              setActive(events.length);
            } else {
              dirtyIndexesRef.current.add(eventModal);
              setEvents((prev) => {
                const next = [...prev];
                next[eventModal] = { ...ensureEventShape(next[eventModal]), ...meta };
                return next;
              });
            }
            setEventModal(null);
          }}
          canDelete={events.length > 1}
          onDelete={() => {
            const removedIndex = eventModal;
            setEvents((prev) => prev.filter((_, i) => i !== removedIndex));
            setActive((prevActive) => {
              if (removedIndex < prevActive) return prevActive - 1;
              if (removedIndex === prevActive) return Math.max(0, prevActive - 1);
              return prevActive;
            });
            setEventModal(null);
          }}
        />
      )}

      <main>
        <aside>
          <ImportPanel onAddNames={addNames} onClearAll={clearAllEntries} existingPlayers={event.players} />
          <EntriesPanel
            event={event}
            onUpdateEvent={updateEvent}
            onGenerate={generate}
            onExportPdf={doExportPdf}
            onFieldFocus={beginFieldEdit}
            onFieldBlur={endFieldEdit}
          />
          {genStatus.msg ? <div className={'status ' + genStatus.cls} style={{ padding: '0 18px 12px' }}>{genStatus.msg}</div> : null}
        </aside>

        <section className="stage">
          {event.bracket ? <MatchProgress bracket={event.bracket} /> : null}
          <div className="stage-top">
            <h2>{event.name} draw</h2>
            <button
              type="button"
              className={'btn small secondary toggle' + (event.hidden ? ' active' : '')}
              title={event.hidden ? 'Hidden from the watch link — click to reveal it' : 'Visible on the watch link — click to hide it'}
              onClick={() => updateEvent((ev) => ({ ...ev, hidden: !ev.hidden }))}
            >
              {event.hidden ? <IconEyeOff width={13} height={13} /> : <IconEye width={13} height={13} />}
              {event.hidden ? 'Hidden' : 'Visible'}
            </button>
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
              {event.bracket && view === 'bracket' && (
                <DrawSearch
                  value={searchTerm}
                  onChange={setSearchTerm}
                  matchCount={searchMatchCount}
                  focusIndex={searchFocus}
                  onFocusIndexChange={setSearchFocus}
                />
              )}
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
            <p className="hint">Set the match status and record set scores for every real match. BYE lines have nothing to schedule.</p>
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
                onClearAdvance={clearAdvance}
                onFieldFocus={beginFieldEdit}
                onFieldBlur={endFieldEdit}
                canvasRef={canvasRef}
                searchTerm={searchTerm}
                searchFocus={searchFocus}
                present={event.present}
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
      <Footer />
    </>
  );
}
