import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { googleLogin } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import "../../css/GoogleSignInButton.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export default function GoogleSignInButton() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setLoading(true);
      try {
        const res = await googleLogin(response.credential);
        setAuth(res.data.user, res.data.token);
        navigate('/');
      } catch {
        addToast('No se pudo iniciar sesión con Google.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [setAuth, addToast, navigate],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function initGsi() {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      });

      // Render the real Google button inside a hidden container.
      // We trigger its click programmatically from our custom button.
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        size: 'large',
        theme: 'outline',
        text: 'continue_with',
        width: 300,
      });

      setGsiReady(true);
    }

    // The GSI script loads async — it may or may not be ready yet.
    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      // Poll until the script is loaded (typically < 1s).
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [handleCredentialResponse]);

  function handleClick() {
    // Trigger the real (hidden) Google button which opens the OAuth popup.
    const iframe = googleBtnRef.current?.querySelector('iframe') as HTMLIFrameElement | null;
    const div = googleBtnRef.current?.querySelector('div[role="button"]') as HTMLElement | null;
    if (div) {
      div.click();
    } else if (iframe) {
      iframe.click();
    } else {
      // Last-resort fallback: One Tap prompt
      window.google?.accounts?.id?.prompt();
    }
  }

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="google-btn-container">
      {/* Hidden real Google button (rendered by GIS, sits on top for click handling) */}
      <div
        ref={googleBtnRef}
        className="google-btn-hidden"
        style={{ opacity: 0.01 }}
        aria-hidden="true"
      />

      {/* Visible custom-styled button (visual layer behind the Google iframe) */}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !gsiReady}
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
