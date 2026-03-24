import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { verifyEmail } from '../../services/api';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  // Initialise from token so the effect never needs to setState synchronously.
  const [state, setState] = useState<State>(token ? 'loading' : 'error');

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-brand-pink mb-8">Variedades DANII</h1>

        {state === 'loading' && (
          <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader size={40} className="text-brand-pink animate-spin" />
            <p className="text-gray-700 font-medium">Verificando tu cuenta…</p>
            <p className="text-muted text-sm">Por favor espera un momento.</p>
          </div>
        )}

        {state === 'success' && (
          <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
            <CheckCircle size={48} className="text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900">¡Cuenta verificada!</h2>
            <p className="text-muted text-sm">
              Tu correo ha sido confirmado. Ya puedes iniciar sesión y disfrutar de
              Variedades DANII.
            </p>
            <Link
              to="/login"
              className="mt-2 w-full bg-brand-pink hover:bg-pink-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm text-center"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
            <XCircle size={48} className="text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Enlace inválido o expirado</h2>
            <p className="text-muted text-sm">
              Este enlace de verificación ya no es válido. Puede haber expirado o ya fue
              usado.
            </p>
            <Link
              to="/register"
              className="mt-2 w-full border border-border hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl transition-colors text-sm text-center"
            >
              Volver al registro
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
