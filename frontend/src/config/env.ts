// Configuration des variables d'environnement
const envConfig = {
  api: {
    // Utilise VITE_API_URL pour Vite, avec fallback sur REACT_APP_API_URL pour compatibilité
    baseURL: import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api/",
    refreshEndpoint: "/token/refresh/",
  },
  websocket: {
    url: import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/api/",
  },
};

// Validation des variables requises
const requiredEnvVars = [
  'VITE_API_URL'
] as const;

requiredEnvVars.forEach((envVar) => {
  if (!import.meta.env[envVar]) {
    console.warn(`⚠️  Variable d'environnement manquante: ${envVar}`);
  }
});

export default envConfig;