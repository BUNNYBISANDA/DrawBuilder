import { useEffect, useRef } from 'react';
import { BOX_W, BOX_H, VGAP, COL_GAP, TOP } from '../utils/layout';
import { displayPlayerName } from '../utils/bracket';

export default function BracketView({
  bracket, moveByes, swapSlot, zoom,
  onAdvance, onSwapClick, onRenameCell, canvasRef,
}) {
  const scalerRef = useRef(null);

  useEffect(() => {
    if (!scalerRef.current || !canvasRef.current) return;
    const c = canvasRef.current;
    const s = scalerRef.current;
    s.style.transform = `scale(${zoom})`;
    s.style.width = (parseFloat(c.style.width || '0') * zoom) + 'px';
    s.style.height = (parseFloat(c.style.height || '0') * zoom) + 'px';
  }, [zoom, bracket]);

  if (!bracket) return null;

  const R = bracket.rounds.length;
  const unit = BOX_H + VGAP;
  const canvasWidth = R * (BOX_W + COL_GAP);
  const canvasHeight = TOP + bracket.size * unit;

  const centerY = (r, i) => TOP + (i + 0.5) * unit * (1 << r) - BOX_H / 2;

  const labels = [];
  for (let r = 0; r < R; r++) {
    const teams = bracket.size >> r;
    labels.push(r === R - 1 ? 'Champion' : teams === 2 ? 'Final' : teams === 4 ? 'Semifinals' : teams === 8 ? 'Quarterfinals' : 'Round of ' + teams);
  }

  const wires = [];
  for (let r = 0; r < R - 1; r++) {
    const x = r * (BOX_W + COL_GAP);
    for (let p = 0; p < (bracket.size >> (r + 1)); p++) {
      const y1 = centerY(r, 2 * p) + BOX_H / 2;
      const y2 = centerY(r, 2 * p + 1) + BOX_H / 2;
      const ym = centerY(r + 1, p) + BOX_H / 2;
      const sx = x + BOX_W, mx = x + BOX_W + COL_GAP / 2;
      wires.push({ l: sx, t: y1 - 1, w: COL_GAP / 2, h: 2, key: `w1-${r}-${p}` });
      wires.push({ l: sx, t: y2 - 1, w: COL_GAP / 2, h: 2, key: `w2-${r}-${p}` });
      wires.push({ l: mx - 1, t: y1 - 1, w: 2, h: y2 - y1 + 2, key: `w3-${r}-${p}` });
      wires.push({ l: mx, t: ym - 1, w: COL_GAP / 2, h: 2, key: `w4-${r}-${p}` });
    }
  }

  return (
    <div id="viewport">
      <div id="scaler" ref={scalerRef}>
        <div id="canvas" ref={canvasRef} style={{ width: canvasWidth, height: canvasHeight }}>
          {labels.map((lab, r) => (
            <div className="rnd-label" key={`lab-${r}`} style={{ left: r * (BOX_W + COL_GAP) }}>{lab}</div>
          ))}
          {wires.map((w) => (
            <div className="wire" key={w.key} style={{ left: w.l, top: w.t, width: w.w, height: w.h }} />
          ))}
          {bracket.rounds.map((round, r) => round.map((cell, i) => {
            const x = r * (BOX_W + COL_GAP);
            const y = centerY(r, i);
            const swapable = moveByes && r === 0 && !!cell;
            const selected = swapable && swapSlot === i;
            const isChamp = r === R - 1 && cell;
            const cls = 'slot'
              + (cell ? (cell.bye ? ' bye' : ' filled') : '')
              + (isChamp ? ' champ winner' : '')
              + (swapable ? ' swapable' : '')
              + (selected ? ' swap-selected' : '');
            const editable = r === 0 && cell && !cell.bye && !moveByes;
            return (
              <div
                key={`s-${r}-${i}`}
                className={cls}
                style={{ left: x, top: y, width: BOX_W, height: BOX_H }}
                title={swapable ? (selected ? 'Selected - click another round-1 slot to swap' : 'Click to select this round-1 slot for swapping')
                  : (cell && !cell.bye && r < R - 1 ? 'Click to advance ' + displayPlayerName(cell) : undefined)}
                onClick={(e) => {
                  if (swapable) { onSwapClick(i); return; }
                  if (cell && !cell.bye && r < R - 1) {
                    if (editable && e.target.classList.contains('nm')) return;
                    onAdvance(r, i);
                  }
                }}
              >
                <span className="seedno">{r === 0 ? i + 1 : (cell && cell.entryNo ? cell.entryNo : '')}</span>
                <span
                  className="nm"
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    if (!editable) return;
                    onRenameCell(cell, e.target.textContent);
                  }}
                  onKeyDown={(e) => {
                    if (editable && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                  }}
                >
                  {cell ? cell.name : ''}
                </span>
                {cell && cell.seed ? <span className="seedmark">{`(${cell.seed})`}</span> : null}
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
}
