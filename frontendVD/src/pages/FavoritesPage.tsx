import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, ShoppingBag } from 'lucide-react';
import { getFavoriteItems } from '../services/api';
import AdminEmptyState from '../components/admin/AdminEmptyState';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import { EssenceCard } from '../components/catalog/EssenceCard';
import ProductCard from '../components/catalog/ProductCard';
import type { Product, Essence } from '../types';
import '../css/FavoritesPage.css';

export default function FavoritesPage() {
  const navigate = useNavigate();

  const { data: res, isLoading, isError, refetch } = useQuery({
    queryKey: ['favorites', 'items'],
    queryFn: () => getFavoriteItems(),
    staleTime: 30 * 1000,
  });

  const products: Product[] = res?.data?.products ?? [];
  const essences: Essence[] = res?.data?.essences ?? [];
  const totalItems = products.length + essences.length;

  return (
    <div className="fav-page">
      <AppBar title="Mis Favoritos" showBack variant="catalog" />

      <main className="fav-main">
        {isLoading && (
          <div className="fav-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="fav-skeleton">
                <div className="fav-skeleton__image" />
                <div className="fav-skeleton__body">
                  <div className="fav-skeleton__line fav-skeleton__line--title" />
                  <div className="fav-skeleton__line fav-skeleton__line--subtitle" />
                  <div className="fav-skeleton__line fav-skeleton__line--action" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <AdminEmptyState
            icon={ShoppingBag}
            title="No pudimos cargar tus favoritos"
            description="Intenta de nuevo en unos segundos"
            variant="error"
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && totalItems === 0 && (
          <AdminEmptyState
            icon={Heart}
            title="No tienes favoritos aún"
            description="Guarda los productos y esencias que más te gusten tocando el corazón"
            action={{
              label: 'Explorar catálogo',
              onClick: () => navigate('/catalogo'),
            }}
          />
        )}

        {!isLoading && !isError && totalItems > 0 && (
          <div className="fav-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {essences.map((essence) => (
              <EssenceCard
                key={essence.id}
                essence={essence}
                onPress={() => navigate(`/esencia/${essence.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <BottomTabBar />
    </div>
  );
}
