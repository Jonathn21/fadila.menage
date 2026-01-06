import axios from "axios";
import { toast } from "@/hooks/use-toast";
import envConfig from "@/config/env";

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const apiClient = axios.create({
  baseURL: envConfig.api.baseURL,
  headers: { "Content-Type": "application/json" },
});

// 🔹 Ajouter token à chaque requête
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🔹 Gestion du refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ⚠️ IMPORTANT : Ne pas tenter de rafraîchir le token pour les échecs de login
    // Cela évitera les redirections intempestives
    if (originalRequest.url?.includes('/login/')) {
      return Promise.reject(error);
    }

    // Si 401 et pas déjà tenté (pour les autres endpoints)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refresh = localStorage.getItem("refresh");
      if (!refresh) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        // ⚠️ Ne pas rediriger ici pour éviter les rechargements de page
        // window.location.href = "/";
        return Promise.reject(error);
      }

      try {
        // Utilise l'URL de base + endpoint de refresh
        const refreshURL = `${envConfig.api.baseURL}token/refresh/`;
        const res = await axios.post(refreshURL, { refresh });
        const newToken = res.data.access;

        localStorage.setItem("access", newToken);
        apiClient.defaults.headers.common["Authorization"] = "Bearer " + newToken;
        processQueue(null, newToken);

        originalRequest.headers["Authorization"] = "Bearer " + newToken;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        // ⚠️ Ne pas rediriger ici non plus
        // window.location.href = "/";
        
        // Vous pouvez éventuellement afficher un toast pour informer l'utilisateur
        // toast({
        //   title: "Session expirée",
        //   description: "Veuillez vous reconnecter",
        //   variant: "destructive",
        // });
        
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Pour les autres erreurs
    return Promise.reject(error);
  }
);

export default apiClient;