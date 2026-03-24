import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { register, applyReferral } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-xs ${met ? 'text-green-600' : 'text-muted'}`}>
      <span className="font-bold">{met ? '✓' : '○'}</span>
      {label}
    </span>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);

  async function handleReferralBlur() {
    if (!referralCode.trim()) return;
    try {
      await applyReferral(referralCode.trim());
      setReferralValid(true);
    } catch {
      setReferralValid(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasLength || !hasNumber) {
      addToast('La contraseña no cumple los requisitos mínimos.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Las contraseñas no coinciden.', 'error');
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      addToast('El teléfono debe tener exactamente 10 dígitos.', 'error');
      return;
    }
    setLoading(true);
    try {
      await register({ name, phone, email, password, referralCode: referralCode || undefined });
      navigate('/verify-email-sent');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'No se pudo crear la cuenta. Intenta de nuevo.')
        : 'No se pudo crear la cuenta. Intenta de nuevo.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-pink">Variedades DANII</h1>
          <p className="text-muted text-sm mt-1">Crea tu cuenta</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col gap-4"
        >
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="name">
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
              placeholder="Ana García"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="phone">
              Teléfono (10 dígitos)
            </label>
            <input
              id="phone"
              type="tel"
              required
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
              placeholder="3001234567"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="reg-email">
              Correo electrónico
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
              placeholder="tu@correo.com"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="reg-password">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="reg-password"
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
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex gap-3 mt-1">
                <PasswordRequirement met={hasLength} label="Mín. 8 caracteres" />
                <PasswordRequirement met={hasNumber} label="Contiene número" />
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="confirm-password">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirm-password"
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

          {/* Referral code */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="referral">
              Código de referido{' '}
              <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              id="referral"
              type="text"
              value={referralCode}
              onChange={(e) => {
                setReferralCode(e.target.value.toUpperCase());
                setReferralValid(null);
              }}
              onBlur={handleReferralBlur}
              className={`border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 transition-colors uppercase tracking-widest ${
                referralValid === true
                  ? 'border-green-400 bg-green-50'
                  : referralValid === false
                  ? 'border-red-400 bg-red-50'
                  : 'border-border focus:border-brand-pink'
              }`}
              placeholder="XXXXXX"
            />
            {referralValid === true && (
              <span className="text-xs text-green-600">
                ¡Código válido! Tu amigo te recomienda 🎉
              </span>
            )}
            {referralValid === false && (
              <span className="text-xs text-red-500">Código de referido inválido.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-pink hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm mt-1"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-pink font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
