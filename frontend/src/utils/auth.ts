// src/utils/auth.ts
// Gestion complète JWT + fetch avec auto-refresh

// Vérifie si un JWT est expiré
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// Tente de rafraîchir le token d’accès
export async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;

  try {
    const res = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      // Refresh invalide → nettoyage + redirection
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/"; // 🔹 Redirection login
      return null;
    }

    const data = await res.json();
    if (data.access) {
      localStorage.setItem("access", data.access);
      return data.access;
    }
    return null;
  } catch (err) {
    console.error("Erreur refresh token:", err);
    return null;
  }
}

// Wrapper fetch qui gère l’expiration et le refresh automatiquement
export async function authFetch(url: string, options: RequestInit = {}) {
  let token = localStorage.getItem("access");

  // Vérif expiration avant l’appel
  if (!token || isTokenExpired(token)) {
    token = await refreshAccessToken();
    if (!token) return null;
  }

  let headers = { ...options.headers, Authorization: `Bearer ${token}` };
  let res = await fetch(url, { ...options, headers });

  // Si 401 → tenter un refresh puis retry
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) return null;

    headers = { ...options.headers, Authorization: `Bearer ${token}` };
    res = await fetch(url, { ...options, headers });
  }

  return res;
}
