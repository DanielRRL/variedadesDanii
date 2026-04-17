import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { verifyEmail, resendVerification } from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';
import "../../css/VerifyEmailSentPage.css";

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
      <h1 className="heading-title">
        Ingresa el código
      </h1>
      <p className="heading-subtitle">
        Enviamos un código de 6 dígitos a tu correo electrónico
      </p>

      {/* Stepper */}
      <div className="stepper">
        {[1, 2, 3].map((n, i) => {
          const done = n < 3;
          const active = n === 3;
          return (
            <React.Fragment key={n}>
              {i > 0 && (
                <div className={`stepper-line ${done ? 'done' : 'pending'}`} />
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
              {n === 3 && (
                <span className="stepper-label">
                  Verificar email
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Code input */}
      <div className="otp-container" onPaste={handlePaste}>
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
              className={`otp-input ${
                d
                  ? 'filled'
                  : isActiveEmpty
                  ? 'active'
                  : ''
              }`}
            />
          );
        })}
      </div>
      <p className="otp-helper">
        Los dígitos se completan automáticamente al pegar el código
      </p>

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={!allFilled || verifying}
        className="btn-primary"
      >
        {verifying
          ? <span className="btn-content"><Loader2 size={16} className="spin" /> Verificando...</span>
          : 'Verificar y activar cuenta'}
      </button>

      {/* Resend info */}
      <div className="resend-container">
        <p className="resend-text">¿No recibiste el correo?</p>
        {resendCooldown > 0 ? (
          <p className="resend-line">
            <span className="resend-highlight">Reenviar código</span>
            <span className="resend-muted"> — disponible en {resendCooldown} segundos</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="resend-button"
          >
            {resending ? 'Reenviando...' : 'Reenviar código'}
          </button>
        )}
      </div>

      {/* Spam note */}
      <div className="alert-warning">
        <p className="alert-warning-text">
          Revisa también tu carpeta de <strong>Spam</strong> si no aparece en tu bandeja principal.
        </p>
      </div>

      <p className="auth-footer">
        <Link to="/login" className="auth-link">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
