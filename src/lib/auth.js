/*
 * Couche d'authentification — Basket Togo
 * ⚠️ IMPLÉMENTATION PROVISOIRE (mock, stockage local du navigateur).
 * Elle expose exactement l'interface qu'on utilisera avec Supabase :
 *   signUp, signIn, signOut, getUser, updateProfile, onChange
 * → pour passer au vrai backend, il suffira de réécrire CE fichier
 *   avec @supabase/supabase-js (les composants ne changent pas).
 *
 * Note : le mot de passe n'est PAS vérifié/stocké ici (prototype).
 * La vraie sécurité (hash, sessions) sera gérée par Supabase.
 */
const KEY_USERS = 'bt_users';
const KEY_SESSION = 'bt_session';

const isBrowser = typeof window !== 'undefined';
function load(key, fallback) {
  if (!isBrowser) return fallback;
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}
function save(key, val) {
  if (isBrowser) localStorage.setItem(key, JSON.stringify(val));
}
function emit() {
  if (isBrowser) window.dispatchEvent(new CustomEvent('bt-auth'));
}
function norm(email) {
  return String(email || '').trim().toLowerCase();
}

export function getUser() {
  return load(KEY_SESSION, null);
}

export function isLoggedIn() {
  return !!getUser();
}

export async function signUp({ pseudo, email, quartier, password }) {
  const users = load(KEY_USERS, {});
  const key = norm(email);
  if (!pseudo || !key) throw new Error('Pseudo et e-mail sont requis.');
  if (users[key]) throw new Error('Un compte existe déjà avec cet e-mail.');
  const user = {
    id: (isBrowser && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    pseudo: pseudo.trim(),
    email: key,
    quartier: (quartier || '').trim(),
    bio: '',
    team: '',
    createdAt: Date.now(),
  };
  users[key] = user;
  save(KEY_USERS, users);
  save(KEY_SESSION, user);
  emit();
  return user;
}

export async function signIn({ email, password }) {
  const users = load(KEY_USERS, {});
  const key = norm(email);
  const user = users[key];
  if (!user) throw new Error("Aucun compte pour cet e-mail. Crée d'abord un compte.");
  save(KEY_SESSION, user);
  emit();
  return user;
}

export function signOut() {
  if (isBrowser) localStorage.removeItem(KEY_SESSION);
  emit();
}

export async function updateProfile(patch) {
  const current = getUser();
  if (!current) throw new Error('Tu dois être connecté.');
  const next = { ...current, ...patch, email: current.email };
  const users = load(KEY_USERS, {});
  users[current.email] = next;
  save(KEY_USERS, users);
  save(KEY_SESSION, next);
  emit();
  return next;
}

/* S'abonner aux changements d'auth (connexion/déconnexion). Renvoie une fonction de désabonnement. */
export function onChange(cb) {
  if (!isBrowser) return () => {};
  const handler = () => cb(getUser());
  window.addEventListener('bt-auth', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('bt-auth', handler);
    window.removeEventListener('storage', handler);
  };
}
