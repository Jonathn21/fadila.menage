// hooks/useWebSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (onMessage: (data: WebSocketMessage) => void) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef<boolean>(false);
  
  // ✅ CORRECTION: Utiliser useRef pour onMessage pour éviter les dépendances
  const onMessageRef = useRef(onMessage);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    // ✅ Éviter les connexions multiples
    if (isConnectingRef.current) {
      console.log('⚠️ Connexion déjà en cours, annulation...');
      return;
    }

    // ✅ Vérifier si déjà connecté
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket déjà connecté');
      return;
    }

    // ✅ Fermer proprement l'ancienne connexion si elle existe
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      console.log('🔄 Fermeture de l\'ancienne connexion...');
      ws.current.close();
      ws.current = null;
    }

    isConnectingRef.current = true;

    try {
      const token = sessionStorage.getItem('access');
      
      if (!token) {
        console.warn('❌ Aucun token JWT trouvé pour WebSocket');
        isConnectingRef.current = false;
        return;
      }

      const wsBase = (import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/").replace(/\/?$/, "/");
      const wsUrl = `${wsBase}notifications/?token=${encodeURIComponent(token)}`;
      
      console.log(`🔗 Connexion WebSocket (tentative ${reconnectAttempts + 1})...`);
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connecté avec succès');
        setIsConnected(true);
        setReconnectAttempts(0);
        isConnectingRef.current = false;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Message WebSocket reçu:', data);
          onMessageRef.current(data); // ✅ Utiliser la ref
        } catch (error) {
          console.error('❌ Erreur parsing message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log(`🔌 WebSocket fermé: Code ${event.code}, Reason: ${event.reason || 'Aucune raison'}`);
        setIsConnected(false);
        isConnectingRef.current = false;
        
        // ✅ Ne pas reconnecter si fermeture normale ou auth échouée
        if (event.code === 1000 || event.code === 4003) {
          if (event.code === 4003) {
            console.error('❌ Authentification échouée - Token invalide');
          }
          return;
        }
        
        // ✅ Reconnecter avec délai exponentiel
        setReconnectAttempts(prev => {
          const newAttempts = prev + 1;
          
          if (newAttempts <= maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, prev), 30000);
            console.log(`⏳ Reconnexion dans ${delay}ms (tentative ${newAttempts}/${maxReconnectAttempts})`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error('❌ Nombre maximum de tentatives atteint');
          }
          
          return newAttempts;
        });
      };

      ws.current.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  }, []); // ✅ CORRECTION: Pas de dépendances pour éviter les re-créations

  const disconnect = useCallback(() => {
    console.log('🛑 Déconnexion manuelle');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Déconnexion utilisateur');
      ws.current = null;
    }
    
    setIsConnected(false);
    setReconnectAttempts(0);
    isConnectingRef.current = false;
  }, []);

  // ✅ CORRECTION: useEffect sans dépendances qui changent
  useEffect(() => {
    connect();
    
    return () => {
      console.log('🧹 Cleanup WebSocket');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
      
      isConnectingRef.current = false;
    };
  }, []); // ✅ Tableau vide = s'exécute UNE SEULE FOIS

  return { 
    isConnected, 
    disconnect,
    reconnectAttempts
  };
};