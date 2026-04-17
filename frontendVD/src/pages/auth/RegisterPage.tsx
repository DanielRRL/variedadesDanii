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
import "../../css/RegisterPage.css";

// ── Password requirement helper ───────────────────────────────────────────────

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`password-requirement ${met ? 'met' : 'not-met'}`}>
      {met
        ? <Check size={12} className="icon icon-check" />
        : <span className="icon icon-circle" />}
      {label}
    </div>
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
  const steps = [1, 2, 3];
  const activeLabel = step === 1 ? 'Datos personales' : 'Contraseña segura';

  return (
    <div className="stepper">
      {steps.map((n, i) => {
        const done   = step > n;
        const active = step === n;
        return (
          <React.Fragment key={n}>
            {i > 0 && (
              <div className={`stepper-line ${
                  done ? 'done' : 'pending'
                }`} />
            )}
            <div className={`stepper-circle ${
                done
                  ? 'done'
                  : active
                  ? 'active'
                  : 'inactive'
              }`}>
              {done ? <Check size={14} strokeWidth={3} /> : n}
            </div>
            {active && (
              <span className="stepper-label">
                {activeLabel}
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
  const [animating, setAnimating] = useState(false);

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
    setAnimating(true);
    setTimeout(() => { setStep(2); setAnimating(false); }, 150);
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
      <h1 className="heading-title">
        {step === 1 ? 'Crea tu cuenta' : 'Crea tu contraseña'}
      </h1>
      <p className="heading-subtitle ">
        {step === 1
          ? 'Completa los 3 pasos para activar tu cuenta y empezar a comprar'
          : 'Elige una contraseña segura para proteger tu cuenta'}
      </p>

      {/* Stepper */}
      <div className="stepper-container">
        <Stepper step={step} />
      </div>

      {/* Step content with transition */}
      <div className={`step-content ${animating ? 'hidden' : 'visible'}`}>

      {/* ── Step 1: Personal data ────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="form">

          {/* Name + Phone row */}
          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="name">
                Nombre completo
              </label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Maria Garcia"
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="phone">
                Celular (para Nequi)
              </label>
              <div className="input-wrapper">
                <Phone size={16} className="input-icon" />
                <input
                  id="phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="input"
                  placeholder="300 000 0000"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="form-label" htmlFor="reg-email">
              Correo electrónico
            </label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="tucorreo@gmail.com"
              />
            </div>
            <p className="helper-text">Te enviaremos un código de verificación a este correo</p>
          </div>

          {/* Referral (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowReferral(!showReferral)}
              className="referral-toggle"
            >
              Tengo un código de referido
              {showReferral ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showReferral && (
              <div className="referral-box">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralValid(null); }}
                  onBlur={handleReferralBlur}
                  className={`input ${
                    referralValid === true
                      ? 'success'
                      : referralValid === false
                      ? 'error'
                      : ''
                  }`}
                  placeholder="XXXXXX"
                />
                {referralValid === true && (
                  <span className="message success"><Check size={12} /> Código válido. Ambos recibirán puntos de bonificación.</span>
                )}
                {referralValid === false && (
                  <span className="message error"><X size={12} /> Código de referido inválido.</span>
                )}
              </div>
            )}
          </div>

          {/* Continue */}
          <button
            type="submit"
            className="btn-primary"
          >
            Continuar
          </button>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">ó registrate con</span>
            <div className="divider-line" />
          </div>

          {/* Google */}
          <GoogleSignInButton />

          <p className="auth-footer">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-link">
              Iniciar sesión
            </Link>
          </p>
        </form>
      )}

      {/* ── Step 2: Password ─────────────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="form">

          {/* Password + Confirm row */}
          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="reg-password">
                Contraseña
              </label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-toggle"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar — 4 segments */}
              <div className="strength-bar">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className={`strength-segment ${
                    score >= n ? `strength-${score}` : ''
                  }`} />
                ))}
              </div>
              {password.length > 0 && score >= 4 && (
                <span className="message success">
                  <Check size={12} /> Contraseña fuerte
                </span>
              )}
              {password.length > 0 && score < 4 && score > 0 && (
                <span className="message muted">{STRENGTH_LABELS[score]}</span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="confirm-password">
                Confirmar contraseña
              </label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="input-toggle"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && (
                <span className={`message ${passwordMatch ? 'success' : 'error'}`}>
                  {passwordMatch ? <><Check size={12} /> Las contraseñas coinciden</> : <><X size={12} /> Las contraseñas no coinciden</>}
                </span>
              )}
            </div>
          </div>

          {/* Requirements checklist */}
          <div className="requirements">
            <PasswordRequirement met={hasLength} label="Mínimo 8 caracteres" />
            <PasswordRequirement met={hasNumber} label="Al menos 1 número" />
            <PasswordRequirement met={hasSpecial} label="Al menos 1 carácter especial" />
          </div>

          {/* Terms */}
          <label className="terms">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-pink rounded"
            />
            <span className="terms-text">
              Acepto los{' '}
              <a href="#" className="terms-link">términos y condiciones</a>
              {' '}y la{' '}
              <a href="#" className="terms-link">política de privacidad</a>
              {' '}de Variedades DANII Perfumería.
            </span>
          </label>

          {/* Buttons */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? <span style={{display:'inline-flex',alignItems:'center',gap:'0.5rem'}}><Loader2 size={16} className="spin" /> Creando cuenta...</span>
              : 'Continuar'}
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="btn-secondary"
          >
            Volver
          </button>
        </form>
      )}

      </div>{/* end transition wrapper */}

    </AuthLayout>
  );
}