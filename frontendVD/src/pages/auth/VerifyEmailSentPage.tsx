import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { verifyEmail, resendVerification } from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';

export default function VerifyEmailSentPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  // Mask email
  const email = user?.email ?? '';
  const maskedEmail = email
    ? email.replace(/^(.{3})(.*)(@.*)$/, (_m, a, b, c) => a + b.replace(/./g, '*') + c)
    : '';

  // Countdown for code expiry (visual — 10 min)
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const min = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const sec = (secondsLeft % 60).toString().padStart(2, '0');

  // Resend countdown (45 seconds)
  const [resendCooldown, setResendCooldown] = useState(45);
  const [resending, setResending] = useState(false);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification();
      addToast('Código reenviado. Revisa tu correo.', 'success');
      setResendCooldown(45);
    } catch {
      addToast('No se pudo reenviar el código.', 'error');
    } finally {
      setResending(false);
    }
  }

  // Digit input refs (6 digits)
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [verifying, setVerifying] = useState(false);

  const firstEmptyIndex = digits.findIndex((d) => !d);
  const allFilled = digits.every((d) => d !== '');

  function handleDigitChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = text[i] ?? '';
    setDigits(next);
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleVerify() {
    const token = digits.join('');
    if (token.length !== 6) return;
    setVerifying(true);
    try {
      await verifyEmail(token);
      navigate('/verify-email?token=' + token);
    } catch {
      addToast('Código inválido o expirado. Intenta de nuevo.', 'error');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AuthLayout
      headline="Casi listo, solo falta verificar tu correo"
      description="La verificación protege tu cuenta y garantiza que puedas recuperar el acceso si lo necesitas."
      features={[
        { icon: <Mail size={18} />, title: 'Enviado a:', description: maskedEmail || 'tu correo' },
        {
          icon: <span className="text-xs font-mono">⏱</span>,
          title: `El código expira en ${min}:${sec} minutos`,
          description: '',
        },
      ]}
    >
      <h1 className="font-heading text-2xl lg:text-[30px] font-bold text-text-primary leading-tight">
        Ingresa el código
      </h1>
      <p className="text-muted text-sm mt-1">
        Enviamos un código de 6 dígitos a tu correo electrónico
      </p>

      {/* Stepper */}
      <div className="flex items-center mt-5 mb-6">
        {[1, 2, 3].map((n, i) => {
          const done = n < 3;
          const active = n === 3;
          return (
            <React.Fragment key={n}>
              {i > 0 && (
                <div className={`h-0.5 w-8 sm:w-12 mx-0.5 transition-colors duration-300 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/30' :
                         'bg-gray-100 text-gray-400 border border-gray-200'
              }`}>
                {done ? <Check size={14} strokeWidth={3} /> : n}
              </div>
              {n === 3 && (
                <span className="ml-2 text-xs sm:text-sm font-medium text-text-primary">
                  Verificar email
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Code input */}
      <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {digits.map((d, i) => {
          const isActiveEmpty = i === firstEmptyIndex && !d;
          return (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              placeholder={isActiveEmpty ? '—' : ''}
              className={`w-11 h-14 sm:w-12 sm:h-16 rounded-xl border-2 text-center text-xl font-heading font-bold outline-none transition-all duration-200 ${
                d
                  ? 'border-brand-pink/60 bg-pink-50 text-brand-pink'
                  : isActiveEmpty
                  ? 'border-brand-pink/40 bg-pink-50/50 text-text-primary focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20'
                  : 'border-gray-200 bg-white text-text-primary focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20'
              }`}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted text-center mt-2">
        Los dígitos se completan automáticamente al pegar el código
      </p>

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={!allFilled || verifying}
        className="w-full bg-brand-pink hover:bg-[#c0154e] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-semibold py-3 rounded-full transition-all text-sm mt-5"
      >
        {verifying
          ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Verificando...</span>
          : 'Verificar y activar cuenta'}
      </button>

      {/* Resend info */}
      <div className="mt-5 text-center">
        <p className="text-sm text-muted">¿No recibiste el correo?</p>
        {resendCooldown > 0 ? (
          <p className="text-sm mt-1">
            <span className="text-brand-pink font-medium">Reenviar código</span>
            <span className="text-muted"> — disponible en {resendCooldown} segundos</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-brand-pink font-medium hover:text-pink-700 transition-colors mt-1 disabled:opacity-50"
          >
            {resending ? 'Reenviando...' : 'Reenviar código'}
          </button>
        )}
      </div>

      {/* Spam note */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
        <p className="text-sm text-yellow-800">
          Revisa también tu carpeta de <strong>Spam</strong> si no aparece en tu bandeja principal.
        </p>
      </div>

      <p className="text-center text-sm text-muted mt-6">
        <Link to="/login" className="text-brand-pink font-medium hover:text-pink-700 transition-colors">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
