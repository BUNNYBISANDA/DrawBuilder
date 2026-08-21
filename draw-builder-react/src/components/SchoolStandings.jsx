import { useMemo, useState } from 'react';
import { computeSchoolStandings } from '../utils/standings';
import { IconSchool, IconChevronUp, IconChevronDown } from './Icon';

const RANK_CLASS = ['rank-1', 'rank-2', 'rank-3'];

export default function SchoolStandings({ bracket }) {
  const [expanded, setExpanded] = useState(false);
  const standings = useMemo(() => computeSchoolStandings(bracket), [bracket]);
  if (!standings.length) return null;

  const totalWins = standings.reduce((sum, s) => sum + s.wins, 0);
  const top = standings.slice(0, 5);
  const rest = standings.slice(5);

  return (
    <div className={'school-bar' + (expanded ? ' open' : '')}>
      <button
        type="button"
        className="school-bar-summary"
        onClick={() => setExpanded((v) => !v)}
        title={expanded ? 'Collapse school standings' : 'Show full school standings'}
      >
        <span className="school-bar-label"><IconSchool width={14} height={14} /> School standings <span className="school-bar-scope">this draw</span></span>
        <span className="school-bar-chips">
          {top.map((s, i) => (
            <span className="school-chip" key={s.code}>
              <span className={'school-chip-rank ' + (RANK_CLASS[i] || '')}>{i + 1}</span>
              <span className="school-chip-code">{s.code}</span>
              <span className="school-chip-record">{s.wins}-{s.losses}</span>
            </span>
          ))}
          {rest.length ? <span className="school-chip school-chip-more">+{rest.length} more</span> : null}
        </span>
        <span className="school-bar-caret">{expanded ? <IconChevronUp width={11} height={11} strokeWidth={2.5} /> : <IconChevronDown width={11} height={11} strokeWidth={2.5} />}</span>
      </button>

      {expanded && (
        <div className="school-bar-panel">
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>School</th>
                <th>W</th>
                <th>L</th>
                <th>Win %</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const played = s.wins + s.losses;
                const pct = played ? Math.round((s.wins / played) * 100) : 0;
                return (
                  <tr key={s.code}>
                    <td>{i + 1}</td>
                    <td>{s.code}</td>
                    <td>{s.wins}</td>
                    <td>{s.losses}</td>
                    <td>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="school-bar-note">{totalWins} decided match{totalWins === 1 ? '' : 'es'} counted in this draw. Switch draws above to see another event's standings.</div>
        </div>
      )}
    </div>
  );
}
