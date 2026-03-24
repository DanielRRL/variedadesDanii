/** CartPage — Shopping cart review and checkout entry point. */
import { useCartStore } from '../stores/cartStore';

export default function CartPage() {
  const { items, grandTotal } = useCartStore();
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <h1 className="font-heading text-2xl font-bold text-text-primary mb-4">
        Mi Carrito
      </h1>
      {items.length === 0 ? (
        <p className="text-muted text-sm">El carrito está vacío.</p>
      ) : (
        <p className="text-brand-gold font-medium">
          Total: ${grandTotal().toLocaleString('es-CO')} COP
        </p>
      )}
    </main>
  );
}
