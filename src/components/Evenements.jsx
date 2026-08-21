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

export default function Evenements() {
  const user = getUser();
  const [events, setEvents] = useState(seed);
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
      terrainId: d.terrainId,
      cat: d.cat,
      prix: d.prix?.trim() || 'Gratuit',
      equipes: d.equipes ? Number(d.equipes) : null,
      img: cover,
      orga: user.pseudo,
    };
    setEvents((list) => [ev, ...list]);
    setOpen(false);
    setCover(null);
    form.reset();
  };

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 30 }}>📅</div>
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
            <div className="field"><label>Date *</label><input name="jour" type="date" required /></div>
            <div className="field"><label>Heure *</label><input name="heure" type="time" required /></div>
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
            <article key={ev.id} className="event-card">
              <div className="event-cover">
                {ev.img ? <img src={ev.img} alt={ev.titre} loading="lazy" /> : <span>🏀</span>}
                <span className="badge type">{ev.type}</span>
              </div>
              <div className="event-body">
                <h3>{ev.titre}</h3>
                <p className="event-date">🗓️ {fmtDate(ev.date)}</p>
                {t && <a className="event-loc" href={'/terrains/' + t.id}>📍 {t.nom} — {t.quartier}</a>}
                <div className="court-meta">
                  <span>🎯 {ev.cat}</span>
                  {ev.equipes ? <span>👥 {ev.equipes} équipes</span> : null}
                  <span>🎟️ {ev.prix}</span>
                </div>
                <div className="event-foot"><small>Organisé par {ev.orga}</small></div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
