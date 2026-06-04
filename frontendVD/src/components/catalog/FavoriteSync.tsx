import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useFavoriteStore } from '../../stores/favoriteStore';

export function FavoriteSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchFavorites = useFavoriteStore((s) => s.fetchFavorites);
  const clearFavorites = useFavoriteStore((s) => s.clearFavorites);
  const retrieved = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (!retrieved.current) {
        retrieved.current = true;
        fetchFavorites();
      }
    } else {
      clearFavorites();
      retrieved.current = false;
    }
  }, [isAuthenticated, fetchFavorites, clearFavorites]);

  return null;
}
