import { useEffect, useState } from 'react';
import { getUser, updateProfile, signOut } from '../lib/auth.js';

export default function Profile() {
  const [user, setUser] = useState(undefined); // undefined = en cours, null = déconnecté
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  if (user === undefined) return null; // évite le flash côté client

  if (!user) {
    return (
      <div className="ctacard" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <h2>Connecte-toi pour voir ton profil</h2>
        <p>Crée ton compte ou connecte-toi pour rejoindre la communauté.</p>
        <a href="/connexion" className="btn btn-white" style={{ marginTop: 18 }}>Se connecter →</a>
      </div>
    );
  }

  const initial = (user.pseudo || user.email || '?').charAt(0).toUpperCase();

  const save = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setSaving(true);
    const next = await updateProfile(data);
    setUser(next);
    setSaving(false);
    setEditing(false);
  };

  const logout = () => {
    signOut();
    window.location.href = '/';
  };

  return (
    <div>
      <div className="card profile-head">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-id">
          <b>@{user.pseudo}</b>
          <span>📍 {user.quartier || 'Quartier non renseigné'}</span>
          {user.team && <span>🏀 {user.team}</span>}
        </div>
        <button type="button" className="btn btn-ghost profile-edit" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Annuler' : 'Éditer'}
        </button>
      </div>

      {editing ? (
        <form className="qform" onSubmit={save} style={{ marginTop: 18 }}>
          <div className="frow">
            <div className="field"><label>Pseudo</label><input name="pseudo" type="text" defaultValue={user.pseudo} required /></div>
            <div className="field"><label>Quartier / ville</label><input name="quartier" type="text" defaultValue={user.quartier} /></div>
          </div>
          <div className="field"><label>Équipe</label><input name="team" type="text" defaultValue={user.team} placeholder="Ex. Lomé Ballers" /></div>
          <div className="field"><label>Bio</label><textarea name="bio" defaultValue={user.bio} placeholder="Poste, style de jeu, objectifs…"></textarea></div>
          <button type="submit" className="btn btn-white" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>
      ) : (
        <>
          <div className="stat-row">
            <div className="mini-stat"><b>0</b><span>Matchs</span></div>
            <div className="mini-stat"><b>0</b><span>Défis</span></div>
            <div className="mini-stat"><b>0</b><span>Posts</span></div>
          </div>
          {user.bio && <div className="card" style={{ marginTop: 16 }}><b style={{ fontFamily: 'Archivo' }}>À propos</b><p style={{ marginTop: 8, color: 'rgba(255,255,255,.8)' }}>{user.bio}</p></div>}
          <div className="card" style={{ marginTop: 16 }}>
            <b style={{ fontFamily: 'Archivo' }}>Compte</b>
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,.8)' }}>✉️ {user.email}</p>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 14 }} onClick={logout}>Se déconnecter</button>
          </div>
        </>
      )}
    </div>
  );
}
