import { useState } from 'react';
import { posts as seed } from '../lib/data.js';
import { getUser } from '../lib/auth.js';

export default function Feed() {
  const user = getUser();
  const [posts, setPosts] = useState(seed);
  const [liked, setLiked] = useState({});
  const [draft, setDraft] = useState('');

  const toggleLike = (id) => {
    setLiked((l) => ({ ...l, [id]: !l[id] }));
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, likes: p.likes + (liked[id] ? -1 : 1) } : p)));
  };

  const publish = (e) => {
    e.preventDefault();
    const txt = draft.trim();
    if (!txt) return;
    const p = {
      id: 'u' + Date.now(),
      auteur: user.pseudo,
      team: user.team || 'Basket Togo',
      ini: (user.pseudo || '?').charAt(0).toUpperCase(),
      accent: 'a-orange',
      txt,
      likes: 0,
      coms: 0,
      media: null,
      time: "à l'instant",
    };
    setPosts((ps) => [p, ...ps]);
    setDraft('');
  };

  return (
    <div className="feed">
      {user ? (
        <form className="composer" onSubmit={publish}>
          <div className="rv-ini" style={{ background: 'var(--energy)', color: '#0B0B0F' }}>{(user.pseudo || '?').charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <textarea placeholder="Quoi de neuf sur les terrains ?" value={draft} onChange={(e) => setDraft(e.target.value)} rows={2}></textarea>
            <div className="composer-actions">
              <span className="composer-media">📷 Photo · 🎬 Vidéo</span>
              <button type="submit" className="btn btn-white" disabled={!draft.trim()}>Publier</button>
            </div>
          </div>
        </form>
      ) : (
        <div className="card" style={{ textAlign: 'center', marginBottom: 20 }}>
          <p style={{ color: 'rgba(255,255,255,.82)' }}>Connecte-toi pour poster et réagir.</p>
          <a href="/connexion" className="btn btn-white" style={{ marginTop: 12 }}>Se connecter →</a>
        </div>
      )}

      {posts.map((p) => (
        <article className={'post ' + p.accent}>
          <header className="post-head">
            <span className="rv-ini">{p.ini}</span>
            <div><b>{p.auteur}</b><small>{p.team} · {p.time}</small></div>
          </header>
          <p className="post-txt">{p.txt}</p>
          {p.media && (
            <div className={'post-media ' + p.media}>
              <span>{p.media === 'video' ? '▶' : '📷'}</span>
            </div>
          )}
          <footer className="post-actions">
            <button type="button" className={'pa' + (liked[p.id] ? ' on' : '')} onClick={() => toggleLike(p.id)}>
              {liked[p.id] ? '❤️' : '🤍'} {p.likes}
            </button>
            <button type="button" className="pa">💬 {p.coms}</button>
            <button type="button" className="pa">↗️ Partager</button>
          </footer>
        </article>
      ))}
    </div>
  );
}
