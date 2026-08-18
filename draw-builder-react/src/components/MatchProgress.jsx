import { flattenMatches } from '../utils/bracket';

export default function MatchProgress({ bracket }) {
  if (!bracket) return null;
  const real = flattenMatches(bracket).filter((m) => !m.isBye);
  const total = real.length;
  if (!total) return null;

  const counts = { scheduled: 0, 'in-progress': 0, completed: 0, walkover: 0, retired: 0 };
  real.forEach(({ match }) => { counts[match.status] = (counts[match.status] || 0) + 1; });

  const done = counts.completed + counts.walkover + counts.retired;
  const toPlay = counts.scheduled + counts['in-progress'];
  const pct = Math.round((done / total) * 100);

  const segments = [
    { key: 'completed', cls: 'seg-completed', n: counts.completed },
    { key: 'walkover', cls: 'seg-walkover', n: counts.walkover },
    { key: 'retired', cls: 'seg-retired', n: counts.retired },
    { key: 'in-progress', cls: 'seg-inprogress', n: counts['in-progress'] },
    { key: 'scheduled', cls: 'seg-scheduled', n: counts.scheduled },
  ].filter((s) => s.n > 0);

  return (
    <div className="match-progress">
      <div className="mp-head">
        <span className="mp-title">Match progress</span>
        <span className="mp-frac"><b>{done}</b> / {total} played · {pct}%</span>
      </div>
      <div className="mp-bar" title={`${done} of ${total} matches decided`}>
        {segments.map((s) => (
          <span key={s.key} className={'mp-seg ' + s.cls} style={{ width: `${(s.n / total) * 100}%` }} />
        ))}
      </div>
      <div className="mp-legend">
        <span className="mp-chip mp-completed"><i /> Completed <b>{counts.completed}</b></span>
        <span className="mp-chip mp-toplay"><i /> To play <b>{toPlay}</b></span>
        {counts['in-progress'] > 0 && <span className="mp-chip mp-inprogress"><i /> In progress <b>{counts['in-progress']}</b></span>}
        {counts.walkover > 0 && <span className="mp-chip mp-walkover"><i /> Walkover <b>{counts.walkover}</b></span>}
        {counts.retired > 0 && <span className="mp-chip mp-retired"><i /> Retired <b>{counts.retired}</b></span>}
      </div>
    </div>
  );
}
