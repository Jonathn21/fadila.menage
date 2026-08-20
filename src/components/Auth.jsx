import { useState } from 'react';
import { signUp, signIn } from '../lib/auth.js';

export default function Auth() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(data);
      } else {
        await signIn(data);
      }
      window.location.href = '/profil';
    } catch (e2) {
      setErr(e2.message || 'Une erreur est survenue.');
      setBusy(false);
    }
  };

  return (
    <div className="tabpanel" style={{ maxWidth: 460 }}>
      <div className="tabs" role="tablist">
        <button type="button" className={'tab' + (mode === 'signin' ? ' active' : '')} onClick={() => { setMode('signin'); setErr(''); }}>
          Se connecter
        </button>
        <button type="button" className={'tab' + (mode === 'signup' ? ' active' : '')} onClick={() => { setMode('signup'); setErr(''); }}>
          Créer un compte
        </button>
      </div>

      <form className="qform" onSubmit={submit} noValidate>
        <h2>{mode === 'signup' ? 'Rejoins la communauté 🏀' : 'Content de te revoir 👋'}</h2>
        <p className="sub">
          {mode === 'signup'
            ? 'Un pseudo, ton quartier, et c’est parti.'
            : 'Connecte-toi pour retrouver ton équipe et tes défis.'}
        </p>

        {mode === 'signup' && (
          <div className="frow">
            <div className="field"><label>Pseudo</label><input name="pseudo" type="text" placeholder="Ex. KingKossi" required /></div>
            <div className="field"><label>Quartier / ville</label><input name="quartier" type="text" placeholder="Ex. Bè, Lomé" required /></div>
          </div>
        )}

        <div className="field"><label>E-mail</label><input name="email" type="email" placeholder="toi@exemple.com" required /></div>
        <div className="field"><label>Mot de passe</label><input name="password" type="password" placeholder="••••••••" minLength={4} required /></div>

        {err && <p className="field-err" style={{ marginBottom: 12 }}>{err}</p>}

        <button type="submit" className="btn btn-white" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
          {busy ? 'Un instant…' : mode === 'signup' ? 'Créer mon compte →' : 'Se connecter →'}
        </button>

        <p className="req-note">
          {mode === 'signup' ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErr(''); }}
            style={{ background: 'none', border: 0, color: 'var(--volt)', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>
            {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </p>
      </form>
    </div>
  );
}
