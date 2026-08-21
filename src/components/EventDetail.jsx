import { useEffect, useState } from 'react';
import { evenements as seed, terrainById } from '../lib/data.js';

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
function fmtRange(iso, isoFin) {
  if (!isoFin) return fmtDate(iso);
  if (sameDay(iso, isoFin)) return fmtDate(iso) + ' → ' + new Date(isoFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return fmtDate(iso) + ' → ' + fmtDate(isoFin);
}

export default function EventDetail() {
  const [ev, setEv] = useState(undefined);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem('bt_events')) || []; } catch {}
    setEv([...stored, ...seed].find((e) => e.id === id) || null);
  }, []);

  if (ev === undefined) return null;

  if (!ev) {
    return (
      <section><div className="wrap" style={{ maxWidth: 620 }}>
        <div className="ctacard" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🤷</div>
          <h2>Événement introuvable</h2>
          <a href="/evenements" className="btn btn-white" style={{ marginTop: 16 }}>← Retour aux événements</a>
        </div>
      </div></section>
    );
  }

  const t = terrainById(ev.terrainId);
  const mapQ = encodeURIComponent((t ? t.quartier : '') + ', Togo');

  return (
    <>
      <section className="detail-hero">
        {ev.img ? <img src={ev.img} alt={ev.titre} /> : <div className="detail-hero-ph">🏀</div>}
        <div className="detail-hero-overlay" aria-hidden="true"></div>
        <a href="/evenements" className="detail-back">← Événements</a>
        <div className="detail-hero-copy">
          <span className="badge type" style={{ position: 'static', display: 'inline-block', marginBottom: 8 }}>{ev.type}</span>
          <h1>{ev.titre}</h1>
          <p>🗓️ {fmtRange(ev.date, ev.dateFin)}</p>
        </div>
      </section>

      <section><div className="wrap" style={{ maxWidth: 720 }}>
        <div className="court-meta big">
          <span>🎯 {ev.cat}</span>
          {ev.equipes ? <span>👥 {ev.equipes} équipes</span> : null}
          <span>🎟️ {ev.prix}</span>
          <span>🧑‍💼 {ev.orga}</span>
        </div>

        {ev.desc && <><h2 className="detail-section-t">À propos</h2><p style={{ color: 'rgba(255,255,255,.85)', lineHeight: 1.6 }}>{ev.desc}</p></>}

        {t && (
          <>
            <h2 className="detail-section-t">Lieu</h2>
            <a className="event-loc" href={'/terrains/' + t.id} style={{ fontSize: '1rem' }}>📍 {t.nom} — {t.quartier}</a>
            <div className="map-embed" style={{ marginTop: 12 }}>
              <iframe src={`https://www.google.com/maps?q=${mapQ}&output=embed`} loading="lazy" title={'Carte — ' + t.nom}></iframe>
            </div>
          </>
        )}

        {ev.img && (
          <>
            <h2 className="detail-section-t">Affiche</h2>
            <img src={ev.img} alt={'Affiche — ' + ev.titre} className="event-poster" />
          </>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
          <a href="/connexion" className="btn btn-white">S'inscrire →</a>
          {t && <a href={'/terrains/' + t.id} className="btn btn-ghost">Voir le terrain</a>}
        </div>
      </div></section>
    </>
  );
}
