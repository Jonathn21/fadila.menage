import { useEffect, useId, useRef, useState } from 'react';

const normalize = (o) => (typeof o === 'string' ? { value: o, label: o } : o);

export default function Select({ value, onChange, options, placeholder = '— Sélectionnez —' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const opts = options.map(normalize);
  const selectedIndex = opts.findIndex((o) => o.value === value);
  const current = selectedIndex >= 0 ? opts[selectedIndex] : null;
  const labelId = useId();

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Position de départ du surligné à l'ouverture
  useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  const choose = (i) => {
    onChange(opts[i].value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((a) => Math.min(opts.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (active >= 0) choose(active);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className={'sel' + (open ? ' open' : '')} ref={rootRef}>
      <button
        type="button"
        className={'sel-btn' + (current ? '' : ' placeholder')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className="sel-val">{current ? current.label : placeholder}</span>
        <i className="fa-solid fa-chevron-down sel-arrow" aria-hidden="true"></i>
      </button>

      {open && (
        <ul className="sel-list" role="listbox" aria-labelledby={labelId}>
          {opts.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={
                'sel-opt' +
                (i === active ? ' active' : '') +
                (o.value === value ? ' selected' : '')
              }
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(i); }}
            >
              <span className="sel-opt-label">{o.label}</span>
              {o.description && <span className="sel-opt-desc">{o.description}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
