import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, Loader2, RefreshCcw, Bell } from 'lucide-react';
import { verifyEmail } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import AuthLayout from '../../components/auth/AuthLayout';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<State>(token ? 'loading' : 'error');

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  const userName = user?.name?.split(' ')[0] ?? '';

  // Success variant
  if (state === 'success') {
    return (
      <AuthLayout
        headline="¡Cuenta activada con éxito!"
        description="Ya eres parte de la familia Variedades DANII. Te esperan fragancias increíbles al mejor precio."
        variant="green"
        features={[
          {
            icon: <span className="text-3xl font-heading font-bold text-yellow-300">+2</span>,
            title: 'Fichas de bienvenida acreditados',
            description: 'fichas en tu cuenta',
          },
        ]}
      >
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-text-primary">
          {userName ? `Bienvenida, ${userName}` : '¡Bienvenido!'}
        </h1>
        <p className="text-muted text-sm mt-1">
          Tu cuenta está lista. Descubre todo lo que Variedades DANII tiene para ti.
        </p>

        {/* Welcome bonus card */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-brand-pink/10 rounded-full flex items-center justify-center">
              <span className="text-brand-pink text-lg">🎁</span>
            </div>
            <div>
              <p className="font-heading font-semibold text-sm text-text-primary">Bono de bienvenida activo</p>
              <p className="text-xs text-muted">Por unirte a Variedades Danii</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-yellow-100">
            <span className="text-sm text-text-primary">Fichas disponibles ahora</span>
            <span className="font-heading font-bold text-lg text-brand-pink">2 VDC's</span>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <RefreshCcw size={18} className="mx-auto text-muted mb-1" />
            <p className="text-xs font-semibold text-text-primary">Programa Frascos</p>
            <p className="text-[10px] text-muted">Devuelve y ahorra $2.000 cada vez</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <Bell size={18} className="mx-auto text-muted mb-1" />
            <p className="text-xs font-semibold text-text-primary">Notificaciones WhatsApp</p>
            <p className="text-[10px] text-muted">Recibe el estado de tus pedidos</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/catalogo')}
          className="w-full bg-brand-pink hover:bg-pink-700 active:scale-[0.98] text-white font-heading font-semibold py-3 rounded-full transition-colors text-sm mt-6"
        >
          Explorar el catálogo
        </button>
      </AuthLayout>
    );
  }

  // Loading / Error
  return (
    <AuthLayout
      headline={state === 'loading' ? 'Verificando tu cuenta...' : 'Enlace inválido'}
      description={state === 'loading' ? 'Esto tarda solo unos segundos.' : 'Este enlace de verificación ya no es válido.'}
    >
      {state === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 size={40} className="text-brand-pink animate-spin" />
          <p className="text-gray-700 font-heading font-medium">Verificando tu cuenta…</p>
          <p className="text-muted text-sm">Por favor espera un momento.</p>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <XCircle size={48} className="text-red-500" />
          <h2 className="text-xl font-heading font-semibold text-gray-900">Enlace inválido o expirado</h2>
          <p className="text-muted text-sm text-center">
            Este enlace de verificación ya no es válido. Puede haber expirado o ya fue usado.
          </p>
          <Link
            to="/register"
            className="w-full border border-border hover:bg-gray-50 text-brand-pink font-heading font-semibold py-3 rounded-full transition-colors text-sm text-center block mt-2"
          >
            Volver al registro
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
