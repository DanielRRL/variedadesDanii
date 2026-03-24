/** OrderDetailPage — Full detail for a single order (/pedido/:id). */
import { useParams } from 'react-router-dom';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">
        Detalle del Pedido
      </h1>
      <p className="text-muted text-sm">ID: {id} — Página en construcción</p>
    </main>
  );
}
