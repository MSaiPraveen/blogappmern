import { useState, useEffect } from 'react';

/**
 * Hook to detect online/offline status
 * @returns {Object} { isOnline, isOffline }
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline
  };
}

export default useOnlineStatus;
