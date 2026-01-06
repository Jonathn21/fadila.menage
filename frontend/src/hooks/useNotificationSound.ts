// hooks/useNotificationSound.ts
import { useState, useCallback } from 'react';

export const useNotificationSound = () => {
  const [currentSound, setCurrentSound] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const playNotificationSound = useCallback((son: string) => {
    // Vérifier si les sons sont activés dans les préférences utilisateur
    const soundsEnabled = localStorage.getItem('notification_sounds') !== 'false';
    
    if (!soundsEnabled || son === 'none') {
      return;
    }

    setCurrentSound(son);
    setIsPlaying(true);
  }, []);

  const handleSoundPlayed = useCallback(() => {
    setIsPlaying(false);
    setCurrentSound('');
  }, []);

  return {
    currentSound,
    isPlaying,
    playNotificationSound,
    handleSoundPlayed
  };
};