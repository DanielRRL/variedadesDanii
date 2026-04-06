import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import { forgotPassword } from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';
import type { FeatureCard } from '../../components/auth/AuthLayout';

const FEATURES: FeatureCard[] = [
  { icon: <Mail size={18} />, title: 'Enlace por email', description: 'Válido 30 min · un solo uso' },
  { icon: <ShieldCheck size={18} />, title: 'Sesiones anteriores cerradas', description: 'Para proteger tu cuenta' },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
    } catch {
      // Intentionally silent — prevents user enumeration
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      headline="Te ayudamos a recuperar el acceso"
      description="Recibirás un enlace seguro por correo para crear una nueva contraseña en minutos."
      features={FEATURES}
    >
      {/* Title */}
      <h1 className="font-heading text-2xl lg:text-3xl font-bold text-text-primary">
        Recuperar contraseña
      </h1>
      <p className="text-muted text-sm mt-1">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
      </p>

      {!sent ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700" htmlFor="forgot-email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border rounded-xl pl-11 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
                placeholder="tucorreo@gmail.com"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-pink hover:bg-pink-700 disabled:opacity-50 text-white font-heading font-semibold py-3 rounded-full transition-colors text-sm mt-1"
          >
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-4 py-4">
          <span className="text-4xl">✉️</span>
          <h2 className="text-base font-heading font-semibold text-gray-900 text-center">
            Revisa tu correo
          </h2>
          <p className="text-sm text-muted text-center leading-relaxed">
            Si existe una cuenta con ese correo electrónico, recibirás las instrucciones
            para restablecer tu contraseña.
          </p>
        </div>
      )}

      {/* Info card */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 space-y-3">
        <h3 className="font-heading font-semibold text-sm text-text-primary">
          ¿Recuerdas cómo accediste?
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-pink" />
          <span className="text-sm text-text-primary">Si usaste email, recibirás el enlace ahí</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
          <span className="text-sm text-text-primary">Si usaste Google, inicia sesión normalmente con Google</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted mt-6">
        <Link to="/login" className="text-brand-pink font-medium hover:underline flex items-center justify-center gap-1">
          <ArrowLeft size={14} /> Volver al inicio de sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
