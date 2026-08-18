import { flattenMatches, displayPlayerName, MATCH_STATUSES } from '../utils/bracket';

const STATUS_LABEL = {
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  completed: 'Completed',
  walkover: 'Walkover',
  retired: 'Retired',
};

function SetScoreInputs({ sets, onChange }) {
  // Always edit a fixed 3-set grid (best of 3); trim trailing empty pairs on save.
  const padded = [0, 1, 2].map((si) => sets[si] || ['', '']);

  function setValue(si, side, value) {
    const next = padded.map((pair) => pair.slice());
    next[si][side] = value;
    let lastFilled = -1;
    next.forEach((pair, idx) => { if (pair[0] !== '' || pair[1] !== '') lastFilled = idx; });
    onChange(next.slice(0, lastFilled + 1));
  }

  return (
    <div className="set-scores">
      {padded.map((set, si) => (
        <span className="set-pair" key={si}>
          <input type="number" min="0" inputMode="numeric" placeholder="-" value={set[0]} onChange={(e) => setValue(si, 0, e.target.value)} />
          <span className="set-sep">–</span>
          <input type="number" min="0" inputMode="numeric" placeholder="-" value={set[1]} onChange={(e) => setValue(si, 1, e.target.value)} />
        </span>
      ))}
    </div>
  );
}

function formatSets(sets) {
  const played = (sets || []).filter((s) => s && (s[0] !== '' || s[1] !== ''));
  if (!played.length) return '—';
  return played.map(([a, b]) => `${a || 0}-${b || 0}`).join(', ');
}

export default function SchedulerView({ bracket, onUpdateMatch, readOnly = false }) {
  const matches = flattenMatches(bracket);

  return (
    <div className="scheduler">
      <table className="sched-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Players</th>
            <th>Status</th>
            <th>Score{readOnly ? '' : ' (best of 3)'}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(({ r, m, roundLabel, a, b, match, isBye }) => (
            <tr key={`${r}-${m}`} className={isBye ? 'sched-bye' : ''}>
              <td>{roundLabel}</td>
              <td>
                {a ? displayPlayerName(a) : <span className="tbd">TBD</span>}
                <span className="vs">vs</span>
                {b ? displayPlayerName(b) : <span className="tbd">TBD</span>}
              </td>
              {isBye ? (
                <td colSpan={2} className="tbd">— BYE, no match to schedule —</td>
              ) : readOnly ? (
                <>
                  <td>{STATUS_LABEL[match.status] || match.status}</td>
                  <td>{formatSets(match.sets)}</td>
                </>
              ) : (
                <>
                  <td>
                    <select
                      className="sched-input"
                      value={match.status}
                      onChange={(e) => onUpdateMatch(r, m, { status: e.target.value })}
                    >
                      {MATCH_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td>
                    <SetScoreInputs sets={match.sets} onChange={(sets) => onUpdateMatch(r, m, { sets })} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
