import { useState } from 'react';
import { evenements as seed, terrains, terrainById, TYPES_EVENT, CATEGORIES } from '../lib/data.js';
import { getUser } from '../lib/auth.js';

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${heure}`;
  } catch {
    return iso;
  }
}

function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function fmtRange(iso, isoFin) {
  if (!isoFin) return fmtDate(iso);
  if (sameDay(iso, isoFin)) {
    const finH = new Date(isoFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${fmtDate(iso)} → ${finH}`;
  }
  return `${fmtDate(iso)} → ${fmtDate(isoFin)}`;
}

const STORE = 'bt_events';
function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; }
}

export default function Evenements() {
  const user = getUser();
  const [events, setEvents] = useState(() =>
    (typeof window === 'undefined' ? seed : [...loadStored(), ...seed])
  );
  const [open, setOpen] = useState(false);
  const [cover, setCover] = useState(null);
  const [err, setErr] = useState('');

  const pickCover = (e) => {
    const f = e.target.files?.[0];
    if (f) setCover(URL.createObjectURL(f));
  };

  const create = (e) => {
    e.preventDefault();
    setErr('');
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.terrainId) { setErr('Choisis un terrain.'); return; }
    const ev = {
      id: 'u' + Date.now(),
      titre: d.titre,
      type: d.type,
      date: `${d.jour}T${d.heure || '00:00'}`,
      dateFin: d.jourFin ? `${d.jourFin}T${d.heureFin || '23:59'}` : null,
      terrainId: d.terrainId,
      cat: d.cat,
      prix: d.prix?.trim() || 'Gratuit',
      equipes: d.equipes ? Number(d.equipes) : null,
      desc: d.desc?.trim() || '',
      img: cover,
      orga: user.pseudo,
    };
    const stored = [ev, ...loadStored()];
    try { localStorage.setItem(STORE, JSON.stringify(stored)); } catch (e2) {}
    setEvents([...stored, ...seed]);
    setOpen(false);
    setCover(null);
    form.reset();
  };

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 28, color: 'var(--energy)' }}><i className="fa-solid fa-calendar-days"></i></div>
        <div style={{ flex: 1, minWidth: 170 }}>
          <b style={{ fontFamily: 'Archivo', fontSize: '1.1rem' }}>Tu organises un événement ?</b>
          <p style={{ color: 'rgba(255,255,255,.72)', marginTop: 2 }}>Tournoi, match ou entraînement sur l'un de nos terrains.</p>
        </div>
        {user ? (
          <button type="button" className="btn btn-white" onClick={() => setOpen((v) => !v)}>{open ? 'Fermer' : '+ Créer un événement'}</button>
        ) : (
          <a href="/connexion" className="btn btn-white">Se connecter pour créer</a>
        )}
      </div>

      {open && user && (
        <form className="qform" onSubmit={create} style={{ marginBottom: 24 }} noValidate>
          <h2>Nouvel événement</h2>
          <div className="field"><label>Titre *</label><input name="titre" type="text" placeholder="Ex. Tournoi 3x3 de Bè" required /></div>
          <div className="frow">
            <div className="field"><label>Type *</label>
              <select name="type" required>{TYPES_EVENT.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div className="field"><label>Catégorie *</label>
              <select name="cat" required>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
          </div>
          <div className="frow">
            <div className="field"><label>Date de début *</label><input name="jour" type="date" required /></div>
            <div className="field"><label>Heure *</label><input name="heure" type="time" required /></div>
          </div>
          <div className="frow">
            <div className="field"><label>Date de fin <span className="opt">(optionnel)</span></label><input name="jourFin" type="date" /></div>
            <div className="field"><label>Heure de fin <span className="opt">(optionnel)</span></label><input name="heureFin" type="time" /></div>
          </div>
          <div className="field"><label>Terrain * (l'un de nos terrains)</label>
            <select name="terrainId" required defaultValue="">
              <option value="" disabled>— Choisis un terrain —</option>
              {terrains.map((t) => <option key={t.id} value={t.id}>{t.nom} — {t.quartier}</option>)}
            </select>
          </div>
          <div className="frow">
            <div className="field"><label>Équipes / participants max</label><input name="equipes" type="number" min="0" placeholder="Ex. 16" /></div>
            <div className="field"><label>Inscription</label><input name="prix" type="text" placeholder="Ex. 1 000 F ou Gratuit" /></div>
          </div>
          <div className="field"><label>Description</label><textarea name="desc" placeholder="Règles, format, contact…"></textarea></div>
          <div className="field"><label>Affiche de l'événement</label><input name="cover" type="file" accept="image/*" onChange={pickCover} /></div>
          {cover && <img src={cover} alt="Aperçu" style={{ width: '100%', borderRadius: 14, marginBottom: 14, maxHeight: 260, objectFit: 'cover' }} />}
          {err && <p className="field-err" style={{ marginBottom: 12 }}>{err}</p>}
          <button type="submit" className="btn btn-white" style={{ width: '100%', justifyContent: 'center' }}>Publier l'événement</button>
        </form>
      )}

      <div className="events-list">
        {events.map((ev) => {
          const t = terrainById(ev.terrainId);
          return (
            <a key={ev.id} className="event-card" href={'/evenement?id=' + ev.id}>
              <div className="event-cover">
                {ev.img ? <img src={ev.img} alt={ev.titre} loading="lazy" /> : <i className="fa-solid fa-basketball"></i>}
                <span className="badge type">{ev.type}</span>
              </div>
              <div className="event-body">
                <h3>{ev.titre}</h3>
                <p className="event-date"><i className="fa-solid fa-calendar-day"></i> {fmtRange(ev.date, ev.dateFin)}</p>
                {t && <span className="event-loc"><i className="fa-solid fa-location-dot"></i> {t.nom} — {t.quartier}</span>}
                <div className="court-meta">
                  <span><i className="fa-solid fa-bullseye"></i> {ev.cat}</span>
                  {ev.equipes ? <span><i className="fa-solid fa-users"></i> {ev.equipes} équipes</span> : null}
                  <span><i className="fa-solid fa-ticket"></i> {ev.prix}</span>
                </div>
                <div className="event-foot"><small>Organisé par {ev.orga}</small></div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
