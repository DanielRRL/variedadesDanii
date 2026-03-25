import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { resetPassword } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';

function strength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const score = strength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      addToast('El enlace de restablecimiento no es válido.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Las contraseñas no coinciden.', 'error');
      return;
    }
    if (score < 2) {
      addToast('Elige una contraseña más segura.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password, confirmPassword);
      addToast('¡Contraseña actualizada! Ya puedes iniciar sesión.', 'success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'El enlace expiró o no es válido. Solicita uno nuevo.')
        : 'El enlace expiró o no es válido. Solicita uno nuevo.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Back to login */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1 text-sm text-muted hover:text-text-primary mb-4 transition-colors"
          aria-label="Volver a login"
        >
          <ArrowLeft size={16} />
          Iniciar sesion
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-pink">Variedades DANII</h1>
          <p className="text-muted text-sm mt-1">Crear nueva contraseña</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col gap-4"
        >
          {/* New password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="new-password">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-700"
                aria-label={showPassword ? 'Ocultar' : 'Ver'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {password.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className={`h-1.5 flex-1 rounded-full ${
                        score >= n ? STRENGTH_COLORS[score] : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted">{STRENGTH_LABELS[score]}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="confirm-new-password">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirm-new-password"
                type={showConfirm ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-700"
                aria-label={showConfirm ? 'Ocultar' : 'Ver'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <span className="text-xs text-red-500 mt-0.5">Las contraseñas no coinciden</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-pink hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm mt-1"
          >
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          <Link to="/forgot-password" className="text-brand-pink font-medium hover:underline">
            Solicitar nuevo enlace
          </Link>
        </p>
      </div>
    </div>
  );
}
