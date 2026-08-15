import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';

export default function ImportPanel({ onAddNames, onClearAll }) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState({ msg: '', cls: '' });
  const [pasteText, setPasteText] = useState('');
  const fileRef = useRef(null);

  const setStat = (msg, cls = '') => setStatus({ msg, cls });

  function handleSheet(f) {
    setStat('Reading spreadsheet…', 'busy');
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const names = [];
        wb.SheetNames.forEach((sn) => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 });
          rows.forEach((row) => {
            (row || []).forEach((cell) => {
              if (typeof cell === 'string') {
                const v = cell.trim();
                if (v && !/^(seed|no\.?|#|player|name|round|champion|winner|match)/i.test(v) && !/^\d+$/.test(v)) {
                  names.push(v);
                }
              }
            });
          });
        });
        const added = onAddNames(names);
        setStat(`Loaded ${names.length} names from ${f.name}` + (added < names.length ? ` (${names.length - added} duplicates skipped)` : ''));
      } catch (err) {
        setStat('Could not read that file: ' + err.message, 'err');
      }
    };
    r.readAsArrayBuffer(f);
  }

  function handleFile(f) {
    if (/\.(xlsx|xls|csv)$/i.test(f.name)) return handleSheet(f);
    setStat('Unsupported file — use .xlsx or .csv.', 'err');
  }

  function loadPaste() {
    const lines = pasteText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) {
      setStat('Nothing to add — paste one name per line.', 'err');
      return;
    }
    const added = onAddNames(lines);
    setStat(`Added ${lines.length} names` + (added < lines.length ? ` (${lines.length - added} duplicates skipped)` : ''));
    setPasteText('');
  }

  return (
    <section className="panel">
      <h2><span className="n">1</span> Import players</h2>
      <label
        className={'drop' + (dragOver ? ' over' : '')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <p><strong>Drop an Excel or CSV file</strong><br />or click to browse. Names are read from every sheet automatically.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={() => {
            if (fileRef.current.files[0]) handleFile(fileRef.current.files[0]);
            fileRef.current.value = '';
          }}
        />
      </label>
      <div className="or">or paste names</div>
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder={'One player (or pair) per line\nSomchai P.\nBunny J.\nArisa / Mook'}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={loadPaste}>Add pasted names</button>
        <button className="btn secondary" onClick={() => { onClearAll(); setStat('List cleared.'); }}>Clear list</button>
      </div>
      <div className={'status ' + status.cls}>{status.msg}</div>
    </section>
  );
}
