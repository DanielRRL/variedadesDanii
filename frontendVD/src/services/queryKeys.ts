/**
 * Shared React Query keys to prevent duplicate fetches.
 * All consumers of the same data MUST use the same key.
 */
export const queryKeys = {
  products: ['products'] as const,
  productsFeatured: ['products', 'featured'] as const,
  essences: ['essences'] as const,
  gameTokens: ['my-game-tokens'] as const,
  gramAccount: ['gram-account'] as const,
  orders: (filters: string[]) => ['my-orders', ...filters] as const,
  users: (search: string) => ['admin-users', search] as const,
  challenge: ['current-challenge'] as const,
  gamificationStats: ['admin-gamification-stats'] as const,
} as const;
