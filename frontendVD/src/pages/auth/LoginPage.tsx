import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { login, resendVerification } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          addToast('Email o contraseña incorrectos.', 'error');
        } else {
          addToast('Ocurrió un error. Intenta de nuevo.', 'error');
        }
      } else {
        addToast('Ocurrió un error. Intenta de nuevo.', 'error');
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-pink">Variedades DANII</h1>
          <p className="text-muted text-sm mt-1">Inicia sesión en tu cuenta</p>
        </div>

        {/* Unverified banner */}
        {unverified && (
          <div className="mb-4 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-4 py-3 text-sm flex flex-col gap-2">
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

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
              placeholder="tu@correo.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-700"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-brand-pink hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-pink hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-brand-pink font-medium hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
