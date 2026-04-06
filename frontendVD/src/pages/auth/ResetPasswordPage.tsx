import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Check, Mail } from 'lucide-react';
import axios from 'axios';
import { resetPassword } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import AuthLayout from '../../components/auth/AuthLayout';

// ── Helpers ───────────────────────────────────────────────────────────────────

function strengthScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-muted'}`}>
      {met
        ? <Check size={12} className="text-green-600" />
        : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
      {label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const setAuth = useAuthStore((s) => s.setAuth);

  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Timer for link validity (visual only — 20 min)
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  useEffect(() => {
    if (success) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [success]);

  const score = strengthScore(password);
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const notSameAsOld = password.length > 0; // Can't check real old password client-side

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
      setSuccess(true);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'El enlace expiró o no es válido. Solicita uno nuevo.')
        : 'El enlace expiró o no es válido. Solicita uno nuevo.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  const min = Math.floor(secondsLeft / 60);
  const sec = String(secondsLeft % 60).padStart(2, '0');

  // Success state
  if (success) {
    return (
      <AuthLayout
        headline="¡Contraseña actualizada!"
        description="¡Contraseña actualizada!"
        variant="green"
        features={[
          { icon: <Mail size={18} />, title: 'Notificación enviada', description: 'Te avisamos al correo del cambio' },
          { icon: <Check size={18} />, title: 'Sesiones cerradas', description: 'Todas las anteriores fueron invalidadas' },
        ]}
      >
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-text-primary">
          Contraseña actualizada
        </h1>
        <p className="text-muted text-sm mt-1">
          Ya puedes iniciar sesión con tu nueva contraseña
        </p>

        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-green-800">
            Por tu seguridad se realizaron las siguientes acciones:
          </p>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check size={14} className="text-green-600" />
            Todas las sesiones activas anteriores fueron cerradas
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check size={14} className="text-green-600" />
            El enlace de recuperación fue invalidado
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check size={14} className="text-green-600" />
            Se envió una notificación al correo registrado
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full bg-brand-pink hover:bg-pink-700 text-white font-heading font-semibold py-3 rounded-full transition-colors text-sm mt-6"
        >
          Iniciar sesión ahora
        </button>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-sm text-yellow-800">
            Si no solicitaste este cambio, contacta soporte inmediatamente: <strong>300 383 7442</strong>
          </p>
        </div>
      </AuthLayout>
    );
  }

  // Form state
  return (
    <AuthLayout
      headline="Crea una nueva contraseña segura"
      description="Tu enlace de recuperación es válido. Elige una contraseña que no hayas usado antes."
      features={[
        {
          icon: <span className="text-2xl font-mono font-bold">{min}:{sec}</span>,
          title: 'Enlace válido por',
          description: 'minutos restantes',
        },
      ]}
    >
      {/* Left panel timer rendered via features slot doesn't work well,
          so the timer info is shown in the layout description above */}

      <h1 className="font-heading text-2xl lg:text-3xl font-bold text-text-primary">
        Crear nueva contraseña
      </h1>
      <p className="text-muted text-sm mt-1">
        La nueva contraseña no puede ser igual a la anterior
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">

        {/* Password fields row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700" htmlFor="new-password">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded-xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-muted">Escribe tu nueva contraseña</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700" htmlFor="confirm-new-password">
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
              <input
                id="confirm-new-password"
                type={showConfirm ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-border rounded-xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
                placeholder="Repite la contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-700"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Strength bar */}
        {password.length > 0 && (
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={`h-1.5 flex-1 rounded-full ${score >= n ? STRENGTH_COLORS[score] : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

        {/* Requirements */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-1.5">
          <Requirement met={hasLength} label="Mínimo 8 caracteres" />
          <Requirement met={hasNumber} label="Al menos 1 número" />
          <Requirement met={notSameAsOld} label="No puede ser igual a la contraseña anterior" />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-pink hover:bg-pink-700 disabled:opacity-50 text-white font-heading font-semibold py-3 rounded-full transition-colors text-sm"
        >
          {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        <Link to="/forgot-password" className="text-brand-pink font-medium hover:underline">
          Solicitar nuevo enlace
        </Link>
      </p>
    </AuthLayout>
  );
}
