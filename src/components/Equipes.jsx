import { useState } from 'react';
import { equipes } from '../lib/data.js';
import { getUser } from '../lib/auth.js';

export default function Equipes() {
  const [joined, setJoined] = useState({});
  const [msg, setMsg] = useState('');

  const join = (id) => {
    if (!getUser()) {
      setMsg('Connecte-toi pour rejoindre une équipe.');
      return;
    }
    setJoined((j) => ({ ...j, [id]: !j[id] }));
    setMsg('');
  };

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 32 }}>👥</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <b style={{ fontFamily: 'Archivo', fontSize: '1.1rem' }}>Pas encore d'équipe ?</b>
          <p style={{ color: 'rgba(255,255,255,.72)', marginTop: 2 }}>Crée la tienne et invite tes potes.</p>
        </div>
        <a href={getUser() ? '#creer' : '/connexion'} className="btn btn-white">Créer une équipe →</a>
      </div>

      {msg && <p className="field-err" style={{ marginBottom: 14 }}>{msg}</p>}

      <div className="svc-grid">
        {equipes.map((e) => (
          <article className={'svc team-card ' + e.accent}>
            <div className="team-crest">{e.nom.charAt(0)}</div>
            <h3>{e.nom}</h3>
            <p className="court-loc">📍 {e.quartier}</p>
            <div className="court-meta">
              <span>👤 {e.membres + (joined[e.id] ? 1 : 0)} membres</span>
              <span>🎯 {e.niveau}</span>
            </div>
            <button type="button" className={'btn ' + (joined[e.id] ? 'btn-ghost' : 'btn-white')} style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={() => join(e.id)}>
              {joined[e.id] ? '✓ Membre' : 'Rejoindre'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
