import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Eye, EyeOff, User, Phone, Mail, Lock, Check, X, Loader2,
  Gift, ClipboardList, History, ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import axios from 'axios';
import { register, applyReferral } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import AuthLayout from '../../components/auth/AuthLayout';
import type { FeatureCard } from '../../components/auth/AuthLayout';

// ── Password requirement helper ───────────────────────────────────────────────

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-muted'}`}>
      {met
        ? <Check size={12} className="text-green-600" />
        : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
      {label}
    </span>
  );
}

// ── Strength helpers ──────────────────────────────────────────────────────────

function strength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[#@%$*!&]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABELS = ['', 'Débil', 'Regular', 'Buena', 'Contraseña fuerte'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

// ── Step configs ──────────────────────────────────────────────────────────────

const STEP_FEATURES: Record<number, { headline: string; description: string; features: FeatureCard[] }> = {
  1: {
    headline: 'Únete a nuestra comunidad de fragancias',
    description: 'Crea tu cuenta gratis y empieza a disfrutar de esencias premium al mejor precio del Eje Cafetero.',
    features: [
      { icon: <Gift size={18} />, title: '2 fichas de bienvenida', description: 'Solo por registrarte hoy' },
      { icon: <ClipboardList size={18} />, title: 'Seguimiento de pedidos', description: 'En tiempo real por WhatsApp' },
      { icon: <History size={18} />, title: 'Historial de compras', description: 'Recarga tu favorita fácilmente' },
    ],
  },
  2: {
    headline: 'Protege tu cuenta con una contraseña segura',
    description: 'Usamos bcrypt de nivel bancario. Tus datos y pedidos están completamente cifrados y seguros.',
    features: [
      { icon: <ShieldCheck size={18} />, title: 'Datos personales cifrados', description: '' },
    ],
  },
};

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  const steps = [
    { n: 1, label: '' },
    { n: 2, label: '' },
    { n: 3, label: step === 1 ? 'Datos personales' : 'Contraseña segura' },
  ];

  return (
    <div className="flex items-center mb-6">
      {steps.map((s, i) => {
        const done   = step > s.n;
        const active = step === s.n;
        return (
          <React.Fragment key={s.n}>
            {i > 0 && (
              <div className={`h-0.5 w-8 sm:w-12 mx-0.5 transition-colors duration-300 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              done   ? 'bg-green-500 text-white' :
              active ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/30' :
                       'bg-gray-100 text-gray-400 border border-gray-200'
            }`}>
              {done ? <Check size={14} strokeWidth={3} /> : s.n}
            </div>
            {s.label && (
              <span className={`ml-2 text-xs sm:text-sm font-medium ${active ? 'text-text-primary' : 'text-muted'}`}>
                {s.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToast = useToastStore((s) => s.addToast);

  const [step, setStep] = useState(1);

  // Step 1 fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2 fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Referral
  const refFromUrl = searchParams.get('ref') ?? '';
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [showReferral, setShowReferral] = useState(!!refFromUrl);

  const [loading, setLoading] = useState(false);

  // Password checks
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[#@%$*!&]/.test(password);
  const passwordMatch = password === confirmPassword && confirmPassword.length > 0;
  const score = strength(password);

  async function handleReferralBlur() {
    if (!referralCode.trim()) return;
    try {
      await applyReferral(referralCode.trim());
      setReferralValid(true);
    } catch {
      setReferralValid(false);
    }
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{10}$/.test(phone)) {
      addToast('El teléfono debe tener exactamente 10 dígitos.', 'error');
      return;
    }
    setStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!hasLength || !hasNumber || !hasSpecial) {
      addToast('La contraseña no cumple los requisitos mínimos.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Las contraseñas no coinciden.', 'error');
      return;
    }
    if (!acceptTerms) {
      addToast('Debes aceptar los términos y condiciones.', 'warning');
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

  const cfg = STEP_FEATURES[step] ?? STEP_FEATURES[1];

  return (
    <AuthLayout headline={cfg.headline} description={cfg.description} features={cfg.features}>

      {/* Title */}
      <h1 className="font-heading text-2xl lg:text-[30px] font-bold text-text-primary leading-tight">
        {step === 1 ? 'Crea tu cuenta' : 'Crea tu contraseña'}
      </h1>
      <p className="text-muted text-sm mt-1">
        {step === 1
          ? 'Completa los 3 pasos para activar tu cuenta y empezar a comprar'
          : 'Elige una contraseña segura para proteger tu cuenta'}
      </p>

      {/* Stepper */}
      <div className="mt-5">
        <Stepper step={step} />
      </div>

      {/* ── Step 1: Personal data ────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">

          {/* Name + Phone row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="name">
                Nombre completo
              </label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all placeholder:text-gray-400"
                  placeholder="Maria Garcia"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="phone">
                Celular (para Nequi)
              </label>
              <div className="relative">
                <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full border border-border rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all placeholder:text-gray-400"
                  placeholder="300 000 0000"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all placeholder:text-gray-400"
                placeholder="tucorreo@gmail.com"
              />
            </div>
            <p className="text-xs text-muted mt-1.5">Te enviaremos un código de verificación a este correo</p>
          </div>

          {/* Referral (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowReferral(!showReferral)}
              className="flex items-center gap-1.5 text-sm text-brand-pink font-medium hover:text-pink-700 transition-colors py-1"
            >
              <Check size={14} />
              Tengo un código de referido
              {showReferral ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showReferral && (
              <div className="mt-2 space-y-1.5">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralValid(null); }}
                  onBlur={handleReferralBlur}
                  className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/20 transition-all uppercase tracking-widest ${
                    referralValid === true ? 'border-green-400 bg-green-50'
                      : referralValid === false ? 'border-red-400 bg-red-50'
                      : 'border-border focus:border-brand-pink'
                  }`}
                  placeholder="XXXXXX"
                />
                {referralValid === true && (
                  <span className="flex items-center gap-1 text-xs text-green-600"><Check size={12} /> Código válido. Ambos recibirán puntos de bonificación.</span>
                )}
                {referralValid === false && (
                  <span className="flex items-center gap-1 text-xs text-red-500"><X size={12} /> Código de referido inválido.</span>
                )}
              </div>
            )}
          </div>

          {/* Continue */}
          <button
            type="submit"
            className="w-full bg-brand-pink hover:bg-[#c0154e] active:scale-[0.98] text-white font-heading font-semibold py-3 rounded-full transition-all text-sm mt-2"
          >
            Continuar
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-muted whitespace-nowrap">ó registrate con</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google */}
          <GoogleSignInButton />

          <p className="text-center text-sm text-muted mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand-pink font-medium hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </form>
      )}

      {/* ── Step 2: Password ─────────────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">

          {/* Password + Confirm row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-password">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-border rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
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

              {/* Strength bar — 4 segments */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${score >= n ? STRENGTH_COLORS[score] : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <span className={`text-xs flex items-center gap-1 ${score >= 4 ? 'text-green-600' : 'text-muted'}`}>
                    {score >= 4 && <Check size={12} />}
                    {STRENGTH_LABELS[score]}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="confirm-password">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-border rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && (
                <span className={`text-xs flex items-center gap-1 mt-1 ${passwordMatch ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordMatch ? <><Check size={12} /> Las contraseñas coinciden</> : <><X size={12} /> Las contraseñas no coinciden</>}
                </span>
              )}
            </div>
          </div>

          {/* Requirements checklist */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-2">
            <PasswordRequirement met={hasLength} label="Mínimo 8 caracteres" />
            <PasswordRequirement met={hasNumber} label="Al menos 1 número" />
            <PasswordRequirement met={hasSpecial} label="Al menos 1 carácter especial" />
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-pink rounded"
            />
            <span className="text-xs text-muted leading-relaxed">
              Acepto los{' '}
              <a href="#" className="text-brand-pink hover:underline">términos y condiciones</a>
              {' '}y la{' '}
              <a href="#" className="text-brand-pink hover:underline">política de privacidad</a>
              {' '}de Variedades DANII Perfumería.
            </span>
          </label>

          {/* Buttons */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-pink hover:bg-[#c0154e] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-semibold py-3 rounded-full transition-all text-sm mt-2"
          >
            {loading
              ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Creando cuenta...</span>
              : 'Continuar'}
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full border border-gray-200 bg-white hover:bg-gray-50 text-brand-pink font-heading font-semibold py-3 rounded-full transition-colors text-sm"
          >
            Volver
          </button>
        </form>
      )}

    </AuthLayout>
  );
}
