import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, X, DollarSign, RefreshCcw, Loader2 } from 'lucide-react';
import axios from 'axios';
import { login, resendVerification } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import AuthLayout from '../../components/auth/AuthLayout';
import type { FeatureCard } from '../../components/auth/AuthLayout';

// ── Feature cards for the left panel ──────────────────────────────────────────

const LOGIN_FEATURES: FeatureCard[] = [
  {
    icon: <DollarSign size={18} />,
    title: 'Precio justo al granel',
    description: 'Elige 1oz, 2oz, 3oz o más',
  },
  {
    icon: <RefreshCcw size={18} />,
    title: 'Descuento por devolución',
    description: 'Devuelve el frasco y ahorra $2.000',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setUnverified(false);
    setLoading(true);
    try {
      const res = await login(email, password);
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403) {
          setUnverified(true);
        } else if (err.response?.status === 401) {
          setError('Correo o contraseña incorrectos. Intenta de nuevo.');
          setFieldErrors({ email: 'Verifica que el correo sea correcto', password: 'Contraseña incorrecta' });
        } else {
          setError('Ocurrió un error. Intenta de nuevo.');
        }
      } else {
        setError('Ocurrió un error. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification();
      addToast('Enlace de verificación enviado. Revisa tu correo.', 'success');
    } catch {
      addToast('No se pudo enviar el enlace. Intenta más tarde.', 'error');
    } finally {
      setResending(false);
    }
  }

  // Left panel changes on error or unverified
  const headline = error
    ? 'Verifica tu correo y contraseña'
    : unverified
    ? 'Verifica tu correo y contraseña'
    : 'Tu fragancia perfecta, al precio que mereces';

  const description = error
    ? 'Asegúrate de usar el mismo correo con el que te registraste. Si olvidaste tu contraseña, puedes recuperarla fácilmente.'
    : unverified
    ? 'Asegúrate de usar el mismo correo con el que te registraste. Si olvidaste tu contraseña, puedes recuperarla fácilmente.'
    : 'Esencias inspiradas en las mejores marcas del mundo, vendidas al granel exactamente como las necesitas.';

  const features: FeatureCard[] = (error || unverified)
    ? [
        { icon: <Mail size={18} />, title: 'Recupera contraseña por email', description: '' },
        { icon: <span className="text-lg">🔑</span>, title: 'Ingresar con Google', description: '' },
      ]
    : LOGIN_FEATURES;

  return (
    <AuthLayout headline={headline} description={description} features={features}>

      {/* Title */}
      <h1 className="font-heading text-2xl lg:text-3xl font-bold text-text-primary">
        ¡Bienvenido de vuelta!
      </h1>
      <p className="text-muted text-sm mt-1">
        Inicia sesión para acceder a tu cuenta y hacer tus pedidos
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mt-6 mb-5">
        <button
          onClick={() => setActiveTab('login')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'login'
              ? 'bg-white border border-brand-pink text-brand-pink shadow-sm'
              : 'text-muted hover:text-text-primary'
          }`}
        >
          Ingresar
        </button>
        <button
          onClick={() => { setActiveTab('register'); navigate('/register'); }}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'register'
              ? 'bg-white border border-brand-pink text-brand-pink shadow-sm'
              : 'text-muted hover:text-text-primary'
          }`}
        >
          Registrase
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4 animate-fadeIn">
          <X size={16} className="flex-none text-red-400 mt-0.5" />
          {error}
        </div>
      )}

      {/* Unverified banner */}
      {unverified && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-4 py-3 text-sm flex flex-col gap-2 animate-fadeIn">
          <span>Tu cuenta aún no está verificada. Revisa tu correo electrónico.</span>
          <button
            onClick={handleResend}
            disabled={resending}
            className="self-start font-medium underline hover:no-underline disabled:opacity-50"
          >
            {resending ? 'Enviando...' : 'Reenviar enlace de verificación'}
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5" htmlFor="email">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors({}); setError(''); }}
              className={`w-full rounded-xl border pl-11 pr-3 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                fieldErrors.email
                  ? 'border-red-400 bg-red-50 focus:ring-red-200 focus:border-red-400'
                  : 'border-border focus:ring-brand-pink/40 focus:border-brand-pink'
              }`}
              placeholder="tucorreo@gmail.com"
            />
          </div>
          {fieldErrors.email && (
            <span className="flex items-center gap-1 text-xs text-red-500 mt-1">
              <X size={12} /> {fieldErrors.email}
            </span>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5" htmlFor="password">
            Contraseña
          </label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors({}); setError(''); }}
              className={`w-full rounded-xl border pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                fieldErrors.password
                  ? 'border-red-400 bg-red-50 focus:ring-red-200 focus:border-red-400'
                  : 'border-border focus:ring-brand-pink/40 focus:border-brand-pink'
              }`}
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && (
            <span className="flex items-center gap-1 text-xs text-red-500 mt-1">
              <X size={12} /> {fieldErrors.password}
            </span>
          )}
        </div>

        {/* Forgot password */}
        <div className="flex justify-end mt-1">
          <Link
            to="/forgot-password"
            className="text-sm text-brand-pink hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-pink hover:bg-pink-700 active:scale-[0.98] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-semibold py-3 rounded-full text-sm mt-1"
        >
          {loading
            ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Ingresando...</span>
            : error
            ? 'Volver a intentar'
            : 'Iniciar Sesión'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted whitespace-nowrap">ó continua con</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google Sign-In */}
        <GoogleSignInButton />
      </form>

      <p className="text-center text-sm text-muted mt-6">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="text-brand-pink font-medium hover:underline">
          Registrate gratis
        </Link>
      </p>
    </AuthLayout>
  );
}
