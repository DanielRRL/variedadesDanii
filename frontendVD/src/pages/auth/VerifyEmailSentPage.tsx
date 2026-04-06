import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import AuthLayout from '../../components/auth/AuthLayout';

export default function VerifyEmailSentPage() {
  const user = useAuthStore((s) => s.user);

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

  // Digit input refs (6 digits for visual display matching screenshot)
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      <h1 className="font-heading text-2xl lg:text-3xl font-bold text-text-primary">
        Ingresa el código
      </h1>
      <p className="text-muted text-sm mt-1">
        Enviamos un código de 6 dígitos a tu correo electrónico
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-0 mt-5 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center">
            {n > 1 && <div className={`w-10 h-0.5 mx-1 ${n <= 3 ? 'bg-green-500' : 'bg-gray-200'}`} />}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              n < 3 ? 'bg-green-500 text-white' : 'bg-brand-pink text-white'
            }`}>
              {n < 3 ? <Check size={14} /> : n}
            </div>
            <span className="ml-2 text-xs hidden sm:inline text-muted">
              {n === 3 ? 'Verificar email' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Code input */}
      <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-heading font-bold rounded-xl border-2 focus:outline-none transition-colors ${
              d
                ? 'border-brand-pink bg-pink-50 text-brand-pink'
                : 'border-border bg-white text-text-primary focus:border-brand-pink'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted text-center mt-2">
        Los dígitos se completan automáticamente al pegar el código
      </p>

      {/* Verify button */}
      <button
        disabled
        className="w-full bg-brand-pink hover:bg-pink-700 disabled:opacity-50 text-white font-heading font-semibold py-3 rounded-full transition-colors text-sm mt-5"
      >
        Verificar y activar cuenta
      </button>

      {/* Resend info */}
      <div className="mt-5 text-center">
        <p className="text-sm text-muted">¿No recibiste el correo?</p>
        <p className="text-sm mt-1">
          <span className="text-brand-pink font-medium">Reenviar código</span>
          <span className="text-muted"> — disponible en 45 segundos</span>
        </p>
      </div>

      {/* Spam note */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
        <p className="text-sm text-yellow-800">
          Revisa también tu carpeta de <strong>Spam</strong> si no aparece en tu bandeja principal.
        </p>
      </div>

      <p className="text-center text-sm text-muted mt-6">
        <Link to="/login" className="text-brand-pink font-medium hover:underline">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
