import { useMemo, useState } from 'react';
import { normalizeName, parseSeedLines, parseLineNumbers, parseSeedEntry, renameSeedByName } from '../utils/names';
import { selectedDrawSize } from '../utils/bracket';

export default function EntriesPanel({ event, onUpdateEvent, onGenerate, onExportPdf }) {
  const players = event.players;
  const [seedFocused, setSeedFocused] = useState(false);
  const [byesFocused, setByesFocused] = useState(false);
  const [seedDraft, setSeedDraft] = useState(null);
  const [byesDraft, setByesDraft] = useState(null);

  function setPlayers(next) {
    onUpdateEvent((ev) => ({ ...ev, players: next, bracket: null }));
  }

  function renameEntry(i, value) {
    const oldName = players[i];
    const nextName = value.trim() || oldName;
    onUpdateEvent((ev) => {
      const nextPlayers = [...ev.players];
      nextPlayers[i] = nextName;
      const nextSeeds = renameSeedByName(ev.seeds, oldName, nextName);
      const nextPresent = (ev.present || []).includes(oldName)
        ? [...(ev.present || []).filter((n) => n !== oldName), nextName]
        : (ev.present || []);
      return { ...ev, players: nextPlayers, seeds: nextSeeds, present: nextPresent, bracket: null };
    });
  }

  function moveEntry(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= players.length) return;
    const next = [...players];
    [next[i], next[j]] = [next[j], next[i]];
    setPlayers(next);
  }

  function removeEntry(i) {
    const next = players.filter((_, idx) => idx !== i);
    setPlayers(next);
  }

  const present = event.present || [];
  function togglePresent(name) {
    onUpdateEvent((ev) => {
      const set = new Set(ev.present || []);
      if (set.has(name)) set.delete(name);
      else set.add(name);
      return { ...ev, present: [...set] };
    });
  }

  function addOne() {
    setPlayers([...players, 'New player']);
  }

  function shuffle() {
    const next = [...players];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setPlayers(next);
  }

  const seedStatus = useMemo(() => {
    const seeds = event.seeds;
    if (!seeds.length) return { msg: 'No seeded players set. All entries fill open lines in entry order.', cls: '' };
    const parsed = seeds.map(parseSeedEntry);
    const entryNames = new Set(players.map(normalizeName));
    const missing = parsed.filter((s) => !entryNames.has(normalizeName(s.name))).map((s) => s.name);
    if (missing.length) {
      return { msg: `${missing.length} seed${missing.length === 1 ? '' : 's'} not found in entries: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`, cls: 'err' };
    }
    const pinned = parsed.filter((s) => s.line).length;
    return {
      msg: `${seeds.length} seeded player${seeds.length === 1 ? '' : 's'} set` + (pinned ? ` (${pinned} pinned to a known line).` : '.'),
      cls: '',
    };
  }, [event.seeds, players]);

  const byeStatus = useMemo(() => {
    const byes = event.customByes;
    if (!byes.length) return { msg: 'No custom BYE lines set. Entries fill open lines in paper order, then BYEs fill the rest.', cls: '' };
    const entryCount = players.filter(Boolean).length;
    if (entryCount < 2) return { msg: `${byes.length} custom BYE line${byes.length === 1 ? '' : 's'} set.`, cls: '' };
    const drawSize = selectedDrawSize(entryCount, event.drawSize);
    const byeCount = drawSize - entryCount;
    const invalid = byes.filter((line) => line < 1 || line > drawSize);
    const tooMany = byes.length > byeCount;
    if (!byeCount) return { msg: 'This draw has no BYEs. Custom BYE lines will be ignored.', cls: 'err' };
    if (invalid.length) return { msg: `Invalid BYE line${invalid.length === 1 ? '' : 's'} for ${drawSize} draw: ${invalid.slice(0, 5).join(', ')}`, cls: 'err' };
    if (tooMany) return { msg: `Only ${byeCount} BYE${byeCount === 1 ? '' : 's'} needed. Extra custom lines will be ignored.`, cls: 'err' };
    return { msg: `${byes.length} custom BYE line${byes.length === 1 ? '' : 's'} set. ${byeCount - byes.length} BYE${byeCount - byes.length === 1 ? '' : 's'} will auto-fill.`, cls: '' };
  }, [event.customByes, event.drawSize, players]);

  return (
    <>
      <section className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h2><span className="n">2</span> Entries <span style={{ fontWeight: 400, fontSize: '12.5px', color: 'var(--ink-2)' }}>- fills the draw in this order</span></h2>
        <div className="seedwrap">
          <div className="seedhead">
            <span>{players.length} entries · {present.length} checked in</span>
            <span className="row" style={{ gap: 6 }}>
              <button className="btn small secondary" title="Randomize the entry order" onClick={shuffle}>Shuffle</button>
              <button className="btn small secondary" onClick={addOne}>+ Add</button>
            </span>
          </div>
          <div className="seedlist">
            {players.map((p, i) => (
              <div className={'seed-row' + (present.includes(p) ? ' present' : '')} key={i}>
                <span className="num">{i + 1}</span>
                <input
                  type="checkbox"
                  className="present-check"
                  title={present.includes(p) ? `${p} is checked in — click to mark as not here` : `Mark ${p} as checked in / available to play`}
                  checked={present.includes(p)}
                  onChange={() => togglePresent(p)}
                />
                <input defaultValue={p} key={p + i} onBlur={(e) => renameEntry(i, e.target.value)} />
                <button className="mv" title="Move up entry number" onClick={() => moveEntry(i, -1)}>▲</button>
                <button className="mv" title="Move down entry number" onClick={() => moveEntry(i, 1)}>▼</button>
                <button className="del" title="Remove" onClick={() => removeEntry(i)}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="seedbox" style={{ marginTop: 12 }}>
          <h2><span className="n">3</span> Seeded players <span style={{ fontWeight: 400, fontSize: '12.5px', color: 'var(--ink-2)' }}>- top players, kept apart in the draw</span></h2>
          <p className="hintline">Optional. One seeded player per line, strongest first. Add <code>@ line</code> to pin a seed to a known draw line (e.g. <code>Bihara Jayadevi (MC) @ 48</code>) instead of auto-placing it.</p>
          <textarea
            value={seedFocused ? (seedDraft ?? event.seeds.join('\n')) : event.seeds.join('\n')}
            onFocus={() => { setSeedFocused(true); setSeedDraft(event.seeds.join('\n')); }}
            onChange={(e) => {
              setSeedDraft(e.target.value);
              onUpdateEvent((ev) => ({ ...ev, seeds: parseSeedLines(e.target.value), bracket: null }));
            }}
            onBlur={() => setSeedFocused(false)}
            placeholder={'Bunny Jayathilaka\nSomchai P. @ 64\nArisa / Mook'}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small secondary" onClick={() => onUpdateEvent((ev) => ({ ...ev, seeds: [], bracket: null }))}>Clear seeds</button>
          </div>
          <div className={'seedstatus ' + seedStatus.cls}>{seedStatus.msg}</div>
        </div>

        <div className="seedbox" style={{ marginTop: 12 }}>
          <h2><span className="n">4</span> Draw size</h2>
          <p className="hintline">Choose 32 to make a 32 draw even when you only have 16 entries.</p>
          <select
            value={event.drawSize || 'auto'}
            onChange={(e) => onUpdateEvent((ev) => ({ ...ev, drawSize: e.target.value, bracket: null }))}
            style={{ width: '100%' }}
          >
            <option value="auto">Auto from entries</option>
            <option value="8">8 draw</option>
            <option value="16">16 draw</option>
            <option value="32">32 draw</option>
            <option value="64">64 draw</option>
            <option value="128">128 draw</option>
            <option value="256">256 draw</option>
          </select>
          <p className="hintline">Custom BYE lines, optional. Type draw line numbers separated by commas, spaces, or new lines.</p>
          <textarea
            value={byesFocused ? (byesDraft ?? event.customByes.join(', ')) : event.customByes.join(', ')}
            onFocus={() => { setByesFocused(true); setByesDraft(event.customByes.join(', ')); }}
            onChange={(e) => {
              setByesDraft(e.target.value);
              const nums = Array.from(new Set(parseLineNumbers(e.target.value)));
              onUpdateEvent((ev) => ({ ...ev, customByes: nums, bracket: null }));
            }}
            onBlur={() => setByesFocused(false)}
            placeholder={'Example for 32 draw:\n2, 4, 6, 8, 10, 12, 14, 16'}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small secondary" onClick={() => onUpdateEvent((ev) => ({ ...ev, customByes: [], bracket: null }))}>Clear BYEs</button>
          </div>
          <div className={'seedstatus ' + byeStatus.cls}>{byeStatus.msg}</div>
        </div>

        <button className="btn" style={{ marginTop: 12, width: '100%' }} onClick={onGenerate}>Generate bracket</button>

        <div className="sidebar-export">
          <div className="row">
            <button className="btn export" title="Downloads a bracket-only PDF. Each page contains up to 32 bracket slots." onClick={() => onExportPdf('side')}>Export PDF</button>
          </div>
          <span className="export-note">Export bracket only - 32 slots per page</span>
        </div>
      </section>
    </>
  );
}
