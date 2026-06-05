import { create } from 'zustand';
import { getMyFavorites, toggleFavorite } from '../services/api';

interface FavoriteState {
  favoriteEssenceIds: string[];
  favoriteProductIds: string[];
  loading: boolean;
  fetched: boolean;
  error: string | null;
}

interface FavoriteActions {
  fetchFavorites: () => Promise<void>;
  toggle: (type: 'essence' | 'product', id: string) => Promise<{ favorited: boolean }>;
  isFavorited: (type: 'essence' | 'product', id: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoriteStore = create<FavoriteState & FavoriteActions>()(
  (set, get) => ({
    favoriteEssenceIds: [],
    favoriteProductIds: [],
    loading: false,
    fetched: false,
    error: null,

    fetchFavorites: async () => {
      set({ loading: true });
      try {
        const res = await getMyFavorites();
        const list: { essenceId?: string | null; productId?: string | null }[] =
          Array.isArray(res.data) ? res.data : (res.data?.data ?? []);

        set({
          favoriteEssenceIds: list
            .filter((f) => f.essenceId != null)
            .map((f) => f.essenceId!),
          favoriteProductIds: list
            .filter((f) => f.productId != null)
            .map((f) => f.productId!),
          loading: false,
          fetched: true,
          error: null,
        });
      } catch {
        set({ loading: false, error: "No se pudieron cargar los favoritos" });
      }
    },

    toggle: async (type, id) => {
      const body = type === 'essence' ? { essenceId: id } : { productId: id };

      // Optimistic update
      const key = type === 'essence' ? 'favoriteEssenceIds' : 'favoriteProductIds';
      const current = get()[key];
      const wasFavorited = current.includes(id);

      set({
        [key]: wasFavorited
          ? current.filter((i) => i !== id)
          : [...current, id],
      } as Partial<FavoriteState>);

      try {
        const res = await toggleFavorite(body);
        const data = res.data?.favorited !== undefined ? res.data : (res.data?.data ?? res.data);
        const favorited: boolean = data.favorited;

        // Ensure consistency with server
        const updated = get()[key];
        if (favorited && !updated.includes(id)) {
          set({ [key]: [...updated, id] } as Partial<FavoriteState>);
        } else if (!favorited && updated.includes(id)) {
          set({ [key]: updated.filter((i) => i !== id) } as Partial<FavoriteState>);
        }

        return { favorited };
      } catch {
        // Revert on error
        set({ [key]: current });
        throw new Error('Failed to toggle favorite');
      }
    },

    isFavorited: (type, id) => {
      const key = type === 'essence' ? 'favoriteEssenceIds' : 'favoriteProductIds';
      return get()[key].includes(id);
    },

    clearFavorites: () => {
      set({
        favoriteEssenceIds: [],
        favoriteProductIds: [],
        loading: false,
        fetched: false,
        error: null,
      });
    },
  })
);
