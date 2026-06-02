import { AlertTriangle } from "lucide-react";
import AdminEmptyState from "./AdminEmptyState";

export function AdminQueryError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <AdminEmptyState
      icon={AlertTriangle}
      title="Error al cargar datos"
      description={message || "No se pudieron cargar los datos. Verifica tu conexión e intenta de nuevo."}
      variant="error"
      onRetry={onRetry}
    />
  );
}
