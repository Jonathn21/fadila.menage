// components/NotificationSound.tsx
import { useEffect, useRef } from 'react';

interface NotificationSoundProps {
  son: string;
  isPlaying: boolean;
  onPlayed: () => void;
}

export const NotificationSound: React.FC<NotificationSoundProps> = ({
  son,
  isPlaying,
  onPlayed
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Mapping des sons vers les fichiers audio
  const soundFiles: Record<string, string> = {
    default: '/sounds/notification-default.mp3',
    success: '/sounds/notification-success.mp3',
    warning: '/sounds/notification-warning.mp3',
    error: '/sounds/notification-error.mp3',
    message: '/sounds/notification-message.mp3',
    bell: '/sounds/notification-bell.mp3',
    chime: '/sounds/notification-chime.mp3',
    none: ''
  };

  useEffect(() => {
    if (isPlaying && son !== 'none' && soundFiles[son]) {
      playSound();
    }
  }, [isPlaying, son]);

  const playSound = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        onPlayed();
      }
    } catch (error) {
      console.warn('Impossible de jouer le son:', error);
      onPlayed();
    }
  };

  if (!soundFiles[son] || son === 'none') {
    return null;
  }

  return (
    <audio
      ref={audioRef}
      src={soundFiles[son]}
      preload="auto"
      onEnded={onPlayed}
    />
  );
};