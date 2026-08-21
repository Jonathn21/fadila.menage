import { useState } from 'react';
import { terrains } from '../lib/data.js';

export default function Terrains() {
  const [q, setQ] = useState('');
  const list = terrains.filter((t) => (t.nom + ' ' + t.quartier).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="field search-field" style={{ marginBottom: 22 }}>
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" placeholder="Cherche un terrain ou un quartier…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 && <p style={{ color: 'rgba(255,255,255,.6)' }}>Aucun terrain trouvé pour « {q} ».</p>}

      <div className="svc-grid">
        {list.map((t) => (
          <a key={t.id} className={'svc court-card ' + t.accent} href={'/terrains/' + t.id}>
            <div className="court-thumb">
              {t.img ? <img src={t.img} alt={t.nom} loading="lazy" /> : <i className="fa-solid fa-location-dot"></i>}
              <span className={'badge ' + (t.ouvert ? 'ok' : 'off')}>{t.ouvert ? 'Ouvert' : 'Fermé'}</span>
            </div>
            <div className="court-body">
              <h3>{t.nom}</h3>
              <p className="court-loc"><i className="fa-solid fa-location-dot"></i> {t.quartier}</p>
              <div className="court-meta">
                <span><i className="fa-solid fa-basketball"></i> {t.paniers} panier{t.paniers > 1 ? 's' : ''}</span>
                <span><i className="fa-solid fa-road"></i> {t.surface}</span>
                <span><i className="fa-solid fa-star"></i> {t.note.toFixed(1)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
