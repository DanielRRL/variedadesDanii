/**
 * HomePage — Premium Landing page for Variedades DANII.
 *
 * Sections (full-screen scroll-snap):
 *  1. Cinematic hero   — Glass blobs, falling petals, Playfair heading, dual CTA
 *  2. Bento Grid       — ¿Por qué elegirnos? 4 premium cards
 *  3. Colección        — Featured products horizontal scroll
 *  4. Loyalty teaser   — Conditional on auth state + fog/mist effect
 *
 * BottomTabBar fixed at bottom (outside scroll container).
 *
 * Styling: Pure CSS in HomePage.css (no Tailwind).
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import '../css/HomePage.css';
import { getProducts, getMyGramAccount } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import { gramProgress } from '../utils/priceCalculator';
import { useScrollReveal } from '../hooks/useScrollReveal';
import {
  HeroSection,
  BentoSection,
  CollectionSection,
  LoyaltySection,
} from '../components/home';
import type { Product, GramAccount } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.length;
  const addItem = useCartStore((s) => s.addItem);

  const addRef = useScrollReveal();

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    refetch: retryProducts,
  } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: getProducts,
    staleTime: 2 * 60 * 1000,
  });

  const products: Product[] = (() => {
    const raw = Array.isArray(productsData?.data)
      ? productsData.data
      : productsData?.data?.products ?? [];
    return raw.filter((p: Product) => p.active).slice(0, 6);
  })();

  const { data: gramRes } = useQuery({
    queryKey: ['gramAccount', 'home'],
    queryFn: getMyGramAccount,
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
  });
  const gram = (gramRes?.data?.account ?? gramRes?.data) as GramAccount | undefined;
  const currentGrams = gram?.currentGrams ?? 0;
  const pct = gramProgress(currentGrams);

  return (
    <div className="home-page">
      <HeroSection
        cartCount={cartCount}
        user={user}
        onNavigate={navigate}
      />

      <BentoSection addRef={addRef} />

      <CollectionSection
        products={products}
        isLoading={productsLoading}
        isError={productsError}
        onRetry={retryProducts}
        onProductPress={(id) => navigate(`/productos/${id}`)}
        onAddToCart={(product) => addItem(product, 1)}
        addRef={addRef}
      />

      <LoyaltySection
        isAuthenticated={isAuthenticated}
        user={user}
        gram={gram}
        currentGrams={currentGrams}
        pct={pct}
        onNavigate={navigate}
        addRef={addRef}
      />

      <BottomTabBar />
    </div>
  );
}
