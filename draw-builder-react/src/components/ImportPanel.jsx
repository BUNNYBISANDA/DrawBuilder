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

  async function handleImage(f) {
    setStat('Reading names from the photo with AI…', 'busy');
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej(new Error('read failed'));
        r.readAsDataURL(f);
      });
      const mt = f.type || 'image/png';
      // NOTE: this calls Anthropic's API directly from the browser, which
      // needs a server-side proxy holding the API key — it cannot work
      // as a bare client-side fetch. See project notes for a proxy setup.
      const resp = await fetch('/api/extract-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, mediaType: mt }),
      });
      if (!resp.ok) throw new Error('extract endpoint unavailable');
      const arr = await resp.json();
      if (!Array.isArray(arr) || !arr.length) throw new Error('no names found');
      const added = onAddNames(arr.map(String));
      setStat(`Read ${arr.length} names from the photo` + (added < arr.length ? ` (${arr.length - added} duplicates skipped)` : ''));
    } catch (err) {
      setStat('Could not extract names from the image (needs a backend proxy). Try a clearer photo, or paste the names instead.', 'err');
    }
  }

  function handleFile(f) {
    if (f.type.startsWith('image/')) return handleImage(f);
    if (/\.(xlsx|xls|csv)$/i.test(f.name)) return handleSheet(f);
    setStat('Unsupported file — use .xlsx, .csv, or an image.', 'err');
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
        <p><strong>Drop an Excel / CSV file or a photo of the entry list</strong><br />or click to browse. Names are read automatically.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,image/*"
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
