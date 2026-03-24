/** EssenceDetailPage — Full detail view for a single essence (/esencia/:id). */
import { useParams } from 'react-router-dom';

export default function EssenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">
        Detalle de Esencia
      </h1>
      <p className="text-muted text-sm">ID: {id} — Página en construcción</p>
    </main>
  );
}
