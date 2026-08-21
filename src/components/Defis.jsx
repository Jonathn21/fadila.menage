import { useState } from 'react';
import { defis as seed, equipes, terrains, terrainById, TYPES_DEFI } from '../lib/data.js';
import { getUser } from '../lib/auth.js';

const STORE = 'bt_defis';
function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; }
}
function saveStored(arr) {
  try { localStorage.setItem(STORE, JSON.stringify(arr)); } catch (e) {}
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

const STATUS = {
  'Accepté': 'ok',
  'Ouvert': 'open',
  'En attente': 'wait',
  'Proposé': 'wait',
  'Décliné': 'off',
  'Terminé': 'off',
};

export default function Defis() {
  const user = getUser();
  const myTeam = user ? (user.team || user.pseudo) : null;
  const [list, setList] = useState(() => (typeof window === 'undefined' ? seed : [...loadStored(), ...seed]));
  const [open, setOpen] = useState(false);
  const [statusMap, setStatusMap] = useState({});
  const [err, setErr] = useState('');

  const setStatus = (id, status) => setStatusMap((m) => ({ ...m, [id]: status }));

  const create = (e) => {
    e.preventDefault();
    setErr('');
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.terrainId) { setErr('Choisis un terrain.'); return; }
    const df = {
      id: 'u' + Date.now(),
      type: d.type,
      teamA: myTeam,
      teamB: d.teamB || 'Défi ouvert',
      terrainId: d.terrainId,
      date: `${d.jour}T${d.heure || '00:00'}`,
      enjeu: d.enjeu?.trim() || '',
      status: 'Proposé',
      auteur: myTeam,
    };
    const stored = [df, ...loadStored()];
    saveStored(stored);
    setList([...stored, ...seed]);
    setOpen(false);
    form.reset();
  };

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 28, color: 'var(--energy)' }}><i className="fa-solid fa-hand-fist"></i></div>
        <div style={{ flex: 1, minWidth: 170 }}>
          <b style={{ fontFamily: 'Archivo', fontSize: '1.1rem' }}>Prêt à en découdre ?</b>
          <p style={{ color: 'rgba(255,255,255,.72)', marginTop: 2 }}>Défie une équipe : choisis le format, le terrain et la date.</p>
        </div>
        {user ? (
          <button type="button" className="btn btn-white" onClick={() => setOpen((v) => !v)}>{open ? 'Fermer' : '+ Lancer un défi'}</button>
        ) : (
          <a href="/connexion" className="btn btn-white">Se connecter pour défier</a>
        )}
      </div>

      {open && user && (
        <form className="qform" onSubmit={create} style={{ marginBottom: 24 }} noValidate>
          <h2>Lancer un défi</h2>
          <p className="sub">Ton équipe : <b style={{ color: '#fff' }}>{myTeam}</b></p>
          <div className="frow">
            <div className="field"><label>Type de défi *</label>
              <select name="type" required>{TYPES_DEFI.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div className="field"><label>Équipe adverse</label>
              <select name="teamB" defaultValue="Défi ouvert">
                <option value="Défi ouvert">Défi ouvert (toute équipe)</option>
                {equipes.filter((e) => e.nom !== myTeam).map((e) => <option key={e.id} value={e.nom}>{e.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Terrain * (l'un de nos terrains)</label>
            <select name="terrainId" required defaultValue="">
              <option value="" disabled>— Choisis un terrain —</option>
              {terrains.map((t) => <option key={t.id} value={t.id}>{t.nom} — {t.quartier}</option>)}
            </select>
          </div>
          <div className="frow">
            <div className="field"><label>Date *</label><input name="jour" type="date" required /></div>
            <div className="field"><label>Heure *</label><input name="heure" type="time" required /></div>
          </div>
          <div className="field"><label>Enjeu / message <span className="opt">(optionnel)</span></label><input name="enjeu" type="text" placeholder="Ex. 10 000 F, le respect du quartier…" /></div>
          {err && <p className="field-err" style={{ marginBottom: 12 }}>{err}</p>}
          <button type="submit" className="btn btn-white" style={{ width: '100%', justifyContent: 'center' }}>Envoyer le défi</button>
        </form>
      )}

      <div className="defis-list">
        {list.map((d) => {
          const t = terrainById(d.terrainId);
          const status = statusMap[d.id] || d.status;
          const canAct = user && (status === 'Proposé' || status === 'En attente' || status === 'Ouvert');
          return (
            <div key={d.id} className="defi-card">
              <div className="defi-top">
                <span className="defi-type"><i className="fa-solid fa-hand-fist"></i> {d.type}</span>
                <span className={'badge d-' + (STATUS[status] || 'wait')}>{status}</span>
              </div>
              <div className="defi-vs">
                <span className="defi-team">{d.teamA}</span>
                <span className="defi-vs-badge">VS</span>
                <span className="defi-team">{d.teamB}</span>
              </div>
              <div className="court-meta" style={{ justifyContent: 'center' }}>
                <span><i className="fa-solid fa-calendar-day"></i> {fmtDate(d.date)}</span>
                {t && <span><i className="fa-solid fa-location-dot"></i> {t.nom}</span>}
                {d.enjeu && <span><i className="fa-solid fa-trophy"></i> {d.enjeu}</span>}
              </div>
              {canAct && (
                <div className="defi-actions">
                  <button type="button" className="btn btn-white" onClick={() => setStatus(d.id, 'Accepté')}><i className="fa-solid fa-check"></i> Accepter</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setStatus(d.id, 'Décliné')}><i className="fa-solid fa-xmark"></i> Décliner</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
