import { useState } from 'react';
import { CATEGORY_PRESETS, GENDER_OPTIONS, TYPE_OPTIONS, deriveEventName } from '../utils/eventMeta';

export default function EventModal({ initial, onSave, onClose }) {
  const [category, setCategory] = useState(initial?.category || '');
  const [customCategory, setCustomCategory] = useState(
    initial?.category && !CATEGORY_PRESETS.includes(initial.category) ? initial.category : ''
  );
  const [gender, setGender] = useState(initial?.gender || '');
  const [type, setType] = useState(initial?.type || 'Singles');
  const [nameOverride, setNameOverride] = useState(initial?.nameOverride || '');

  const effectiveCategory = category === '__custom' ? customCategory : category;
  const preview = nameOverride.trim() || deriveEventName({ category: effectiveCategory, gender, type });

  function submit(e) {
    e.preventDefault();
    onSave({
      category: effectiveCategory.trim(),
      gender,
      type,
      nameOverride: nameOverride.trim(),
      name: preview,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{initial ? 'Edit event' : 'New event'}</h3>

        <label className="modal-field">
          <span>Category / age group</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">None</option>
            {CATEGORY_PRESETS.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__custom">Custom…</option>
          </select>
        </label>
        {category === '__custom' && (
          <input
            className="modal-input"
            placeholder="e.g. Corporate, District trials"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
          />
        )}

        <label className="modal-field">
          <span>Gender</span>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g || 'Not specified'}</option>)}
          </select>
        </label>

        <label className="modal-field">
          <span>Event type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="modal-field">
          <span>Display name override (optional)</span>
          <input
            className="modal-input"
            placeholder={deriveEventName({ category: effectiveCategory, gender, type })}
            value={nameOverride}
            onChange={(e) => setNameOverride(e.target.value)}
          />
        </label>

        <p className="modal-preview">Tab will show: <b>{preview}</b></p>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">{initial ? 'Save' : 'Add event'}</button>
        </div>
      </form>
    </div>
  );
}
