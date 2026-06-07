import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { googleLogin } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import "../../css/GoogleSignInButton.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '__VITE_GOOGLE_CLIENT_ID__';

export default function GoogleSignInButton() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [showFallbackBtn, setShowFallbackBtn] = useState(false);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const gsiReady = useRef(false);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setLoading(true);
      try {
        const res = await googleLogin(response.credential);
        setAuth(res.data.user, res.data.token);
        navigate('/');
      } catch (err: unknown) {
        const ax = err as { response?: { status?: number; data?: { message?: string } }; code?: string };
        if (ax.code === 'ERR_NETWORK' || ax.code === 'ERR_BAD_RESPONSE') {
          addToast('Error de conexión. Verifica tu internet e intenta de nuevo.', 'error');
        } else if (ax.response?.status === 401) {
          addToast('La sesión de Google no es válida. Intenta de nuevo.', 'error');
        } else if (ax.response?.status === 409) {
          addToast(ax.response?.data?.message ?? 'Ya existe una cuenta con esta identidad de Google.', 'error');
        } else if (ax.response?.status === 400) {
          addToast('Google Sign-In no está configurado en el servidor.', 'error');
        } else {
          addToast('No se pudo iniciar sesión con Google. Intenta más tarde.', 'error');
        }
      } finally {
        setLoading(false);
      }
    },
    [setAuth, addToast, navigate],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function initGsi() {
      if (!window.google?.accounts?.id) return;

      // itp_support: upgraded One Tap UX on ITP browsers (Safari, Firefox, Chrome on iOS)
      //   — shows welcome page + popup instead of normal One Tap which requires 3P cookies
      //   Ref: https://developers.google.com/identity/gsi/web/guides/features#upgraded_ux_on_itp_browsers
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      });

      gsiReady.current = true;
    }

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      let attempts = 0;
      const MAX_ATTEMPTS = 75; // 200ms * 75 = 15s timeout
      const interval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [handleCredentialResponse]);

  // Render fallback Google button when One Tap was suppressed
  // use_fedcm_for_button: enables FedCM button UX on Chrome M125+ (desktop) / M128+ (Android)
  //   Ref: https://developers.google.com/identity/gsi/web/guides/fedcm-migration#1-add-a-boolean-flag-to-enable-fedcm-for-button-when-initializing-using-optional
  useEffect(() => {
    if (showFallbackBtn && fallbackRef.current && gsiReady.current) {
      window.google!.accounts!.id.renderButton(fallbackRef.current, {
        type: 'standard',
        size: 'large',
        theme: 'outline',
        text: 'continue_with',
        width: 300,
        click_listener: () => setLoading(true),
      });
    }
  }, [showFallbackBtn]);

  function handleClick() {
    if (loading) return;

    // prompt() displays One Tap prompt or browser credential manager.
    // On ITP browsers (with itp_support:true) shows upgraded UX: welcome page + popup.
    // FedCM is auto-enabled on Chrome 117+ (use_fedcm_for_prompt is deprecated).
    // Ref: https://developers.google.com/identity/gsi/web/reference/js-reference#google.accounts.id.prompt
    window.google?.accounts?.id?.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        // One Tap not shown: no Google session, suppressed, or ITP fallback needed
        // Show the rendered Google button as direct-click fallback
        setShowFallbackBtn(true);
      } else if (notification.isSkippedMoment()) {
        // User cancelled or credential issuance failed → show fallback button
        setShowFallbackBtn(true);
      }
      // isDismissedMoment: credential was returned (callback already handled) or cancel() called
    });
  }

  if (!GOOGLE_CLIENT_ID) return null;

  // Fallback: show the real Google-rendered button (appears after prompt() was suppressed)
  if (showFallbackBtn) {
    return (
      <div className="google-btn-container google-btn-container--fallback">
        <div ref={fallbackRef} />
      </div>
    );
  }

  return (
    <div className="google-btn-container">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="google-btn"
      >
        {loading ? (
          <Loader2 className="google-btn-loader" />
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        <span>{loading ? 'Conectando...' : 'Continuar con Google'}</span>
      </button>
    </div>
  );
}
