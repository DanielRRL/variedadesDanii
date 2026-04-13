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
import "../../css/LoginPage.css";

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
      <h1 className="heading-title">
        ¡Bienvenido de vuelta!
      </h1>
      <p className="heading-subtitle">
        Inicia sesión para acceder a tu cuenta y hacer tus pedidos
      </p>

      {/* Tabs */}
      <div className="tabs">
        <button
          onClick={() => setActiveTab('login')}
          className={`tab-buttom ${
            activeTab === 'login'
              ? 'tab-buttom--active'
              : 'tab-buttom--inactive'
          }`}
        >
          Ingresar
        </button>
        <button
          onClick={() => { setActiveTab('register'); navigate('/register'); }}
          className={`tab-buttom ${
            activeTab === 'register'
              ? 'tab-buttom--active'
              : 'tab-buttom--inactive'
          }`}
        >
          Registrase
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-container">
          {error}
        </div>
      )}

      {/* Unverified banner */}
      {unverified && (
        <div className="unverified-banner">
          <span>Tu cuenta aún no está verificada. Revisa tu correo electrónico.</span>
          <button
            onClick={handleResend}
            disabled={resending}
            className="unverified-button"
          >
            {resending ? 'Enviando...' : 'Reenviar enlace de verificación'}
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="form-container">

        {/* Email */}
        <div>
          <label className="form-label" htmlFor="email">
            Correo electrónico
          </label>
          <div className="input-wrapper">
            <Mail size={18} className="input-icon-left" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors({}); setError(''); }}
              className={`input input-email ${
                fieldErrors.email
                  ? 'input-error' : ''}`}
              placeholder="tucorreo@gmail.com"
            />
          </div>
          {fieldErrors.email && (
            <span className="input-error-text">
              <X size={12} /> {fieldErrors.email}
            </span>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="form-label" htmlFor="password">
            Contraseña
          </label>
          <div className="input-wrapper">
            <Lock size={18} className="input-icon-left" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors({}); setError(''); }}
              className={`input input-password ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && (
            <span className="input-error-text">
              <X size={12} /> {fieldErrors.password}
            </span>
          )}
        </div>

        {/* Forgot password */}
        <div className="forgot-password">
          <Link
            to="/forgot-password"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="submit-button"
        >
          {loading
            ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Ingresando...</span>
            : error
            ? 'Volver a intentar'
            : 'Iniciar Sesión'}
        </button>

        {/* Divider */}
        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">ó continua con</span>
          <div className="divider-line" />
        </div>

        {/* Google Sign-In */}
        <GoogleSignInButton />
      </form>

      <p className="auth-footer">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="auth-link">
          Registrate gratis
        </Link>
      </p>
    </AuthLayout>
  );
}