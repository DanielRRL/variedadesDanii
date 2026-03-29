/**
 * GamesPage — Game room where users spend game tokens to earn grams.
 *
 * Route: /juegos (ProtectedRoute)
 * Data: GET /api/game-tokens/my, GET /api/challenges/current, GET /api/grams/account
 *
 * Sections:
 *  1. Pending tokens header (animated coin or empty state)
 *  2. Expiry warning (tokens expiring within 12 hours)
 *  3. Game selector (Roulette / Puzzle) with confirm bottom sheet
 *  4. Weekly challenge progress
 *  5. Gram balance mini-display → /mis-gramos
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Gem, Clock, Puzzle, Trophy,
  ChevronRight, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getMyGameTokens, getCurrentChallenge, getMyGramAccount, playGame } from '../services/api';
import { useToastStore } from '../stores/toastStore';
import type { GameToken, WeeklyChallenge } from '../types';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';

// ─────────────────────────────────────────────────────────────────────────────
// ResultModal — full-screen celebration overlay
// ─────────────────────────────────────────────────────────────────────────────

interface ResultModalProps {
  gramsWon: number;
  newBalance: number;
  ozCompleted: boolean;
  onClose: () => void;
  onGoToGrams: () => void;
}

function ResultModal({ gramsWon, newBalance, ozCompleted, onClose, onGoToGrams }: ResultModalProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    timerRef.current = setTimeout(onClose, 5000);
    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-pink/80 backdrop-blur-sm font-body">
      {/* Explosion keyframe */}
      <style>{`
        @keyframes celebratePop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }
      `}</style>

      <div className="text-center px-6" style={{ animation: 'celebratePop 0.6s ease-out forwards' }}>
        {/* Stars decoration */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <Gem size={48} className="text-brand-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={1.5} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <span
              key={deg}
              className="absolute w-3 h-3 bg-brand-gold rounded-full"
              style={{
                top: `${50 - 45 * Math.cos((deg * Math.PI) / 180)}%`,
                left: `${50 + 45 * Math.sin((deg * Math.PI) / 180)}%`,
                animation: `sparkle 1.2s ease-in-out ${deg / 360}s infinite`,
              }}
            />
          ))}
        </div>

        <p className="font-heading font-extrabold text-[48px] text-white leading-none">
          ¡Ganaste {gramsWon}g!
        </p>
        <p className="text-white/80 text-sm mt-2">
          Se agregaron {gramsWon} gramos a tu billetera
        </p>

        {/* Progress bar */}
        <div className="mt-5 bg-white/20 rounded-full h-3 overflow-hidden mx-auto max-w-[240px]">
          <div
            className="h-full rounded-full bg-brand-gold transition-all duration-700"
            style={{ width: `${Math.min(100, (newBalance / 13) * 100)}%` }}
          />
        </div>
        <p className="text-white/70 text-xs mt-1.5">{newBalance}g de 13g</p>

        {ozCompleted && (
          <div className="mt-4 bg-white/20 rounded-xl px-4 py-2.5 inline-block">
            <p className="text-white font-heading font-bold text-sm">
              🎉 ¡Completaste 1 onza! Puedes canjear una esencia
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6 justify-center">
          <button
            onClick={onGoToGrams}
            className="bg-white text-brand-pink font-heading font-bold text-sm px-6 py-3 rounded-full"
          >
            Ver mis gramos
          </button>
          <button
            onClick={onClose}
            className="border-2 border-white text-white font-heading font-bold text-sm px-6 py-3 rounded-full"
          >
            Seguir jugando
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: tokensRes, isLoading: tokensLoading } = useQuery({
    queryKey: ['my-game-tokens'],
    queryFn: getMyGameTokens,
    staleTime: 30_000,
  });

  const { data: challengeRes } = useQuery({
    queryKey: ['current-challenge'],
    queryFn: getCurrentChallenge,
    staleTime: 2 * 60 * 1000,
  });

  const { data: gramRes } = useQuery({
    queryKey: ['gram-account'],
    queryFn: getMyGramAccount,
    staleTime: 2 * 60 * 1000,
  });

  const pendingTokens: GameToken[] = tokensRes?.data?.pendingTokens ?? tokensRes?.data ?? [];
  const challenge: WeeklyChallenge | null = challengeRes?.data?.challenge ?? challengeRes?.data ?? null;
  const gramBalance: number = gramRes?.data?.account?.currentGrams ?? gramRes?.data?.currentGrams ?? 0;

  // ── UI state ────────────────────────────────────────────────────────────
  const [confirmGame, setConfirmGame] = useState<'ROULETTE' | 'PUZZLE' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<{
    gramsWon: number; newBalance: number; ozCompleted: boolean;
  } | null>(null);

  const gameSelectorRef = useRef<HTMLDivElement>(null);

  // ── Derived ─────────────────────────────────────────────────────────────
  const now = Date.now();
  const expiringTokens = pendingTokens.filter(
    (t) => new Date(t.expiresAt).getTime() - now < 12 * 60 * 60 * 1000
  );

  // ── Handlers ────────────────────────────────────────────────────────────
  const scrollToGames = () => {
    gameSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePlay = useCallback(async () => {
    if (!confirmGame || pendingTokens.length === 0) return;
    setConfirmGame(null);
    setIsPlaying(true);

    // Pick the earliest-expiring pending token
    const sorted = [...pendingTokens].sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    );
    const token = sorted[0];

    try {
      const res = await playGame(token.id, confirmGame);
      const data = res.data;
      setResult({
        gramsWon: data.gramsWon ?? 0,
        newBalance: data.newGramBalance ?? gramBalance + (data.gramsWon ?? 0),
        ozCompleted: data.ozCompleted ?? false,
      });
      queryClient.invalidateQueries({ queryKey: ['my-game-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['gram-account'] });
    } catch {
      addToast('Error al jugar. Intenta nuevamente.', 'error');
    } finally {
      setIsPlaying(false);
    }
  }, [confirmGame, pendingTokens, gramBalance, addToast, queryClient]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background font-body pb-24">
      <AppBar title="Sala de Juegos" showBack />

      <main className="px-4 py-4 space-y-5">

        {/* ── SECTION 1 — Pending tokens header ──────────────────────────── */}
        <div className="text-center py-6">
          {tokensLoading ? (
            <div className="w-16 h-16 rounded-full bg-border animate-pulse mx-auto" />
          ) : pendingTokens.length > 0 ? (
            <>
              <style>{`
                @keyframes coinPulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.12); }
                }
              `}</style>
              <Gem
                size={56}
                className="text-brand-gold mx-auto"
                strokeWidth={1.5}
                style={{ animation: 'coinPulse 2s ease-in-out infinite' }}
              />
              <p className="font-heading font-bold text-[60px] leading-none text-brand-gold mt-3">
                {pendingTokens.length}
              </p>
              <p className="font-body text-muted text-base mt-1">
                ficha{pendingTokens.length !== 1 ? 's' : ''} disponible{pendingTokens.length !== 1 ? 's' : ''}
              </p>
              <p className="font-body text-muted text-sm mt-1.5 max-w-[260px] mx-auto">
                Ganaste estas fichas por tus compras. ¡Juega para ganar gramos!
              </p>
            </>
          ) : (
            <>
              <Gem size={56} className="text-gray-300 mx-auto" strokeWidth={1.5} />
              <p className="font-heading font-semibold text-lg text-text-primary mt-3">
                No tienes fichas disponibles
              </p>
              <p className="font-body text-muted text-sm mt-1.5">
                Realiza una compra para ganar una ficha de juego
              </p>
              <Link
                to="/catalogo"
                className="inline-block mt-4 bg-brand-pink text-white font-body font-semibold px-6 py-2.5 rounded-full text-sm"
              >
                Ver catálogo
              </Link>
            </>
          )}
        </div>

        {/* ── SECTION 2 — Expiry warning ─────────────────────────────────── */}
        {expiringTokens.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <Clock size={20} className="text-orange-500 flex-none mt-0.5" />
            <div className="flex-1">
              <p className="font-body text-sm text-orange-800 font-medium">
                Tienes {expiringTokens.length} ficha{expiringTokens.length !== 1 ? 's' : ''} que{' '}
                {expiringTokens.length !== 1 ? 'vencen' : 'vence'} en menos de 12 horas. ¡Juega ahora!
              </p>
              <button
                onClick={scrollToGames}
                className="font-body text-sm text-orange-600 font-bold mt-1 underline"
              >
                Jugar ahora
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION 3 — Game selector ──────────────────────────────────── */}
        {pendingTokens.length > 0 && (
          <div ref={gameSelectorRef} className="space-y-3">
            <h2 className="font-heading font-bold text-lg text-text-primary">
              ¿Cómo quieres jugar?
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* ROULETTE */}
              <div className="bg-surface rounded-xl border border-border p-4 flex flex-col items-center text-center">
                <style>{`
                  @keyframes spinHover { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                  .roulette-icon:hover { animation: spinHover 1s linear; }
                `}</style>
                <div className="roulette-icon w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mb-3">
                  <Gem size={28} className="text-brand-gold" strokeWidth={1.5} />
                </div>
                <p className="font-heading font-bold text-sm text-text-primary">
                  Ruleta de la Suerte
                </p>
                <p className="text-[12px] text-muted mt-1">
                  Gana entre 1 y 3 gramos
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Gira y descubre tu premio
                </p>
                <button
                  onClick={() => setConfirmGame('ROULETTE')}
                  className="mt-3 bg-brand-pink text-white font-body font-semibold text-sm px-5 py-2.5 rounded-full w-full"
                >
                  Jugar Ruleta
                </button>
              </div>

              {/* PUZZLE */}
              <div className="bg-surface rounded-xl border border-border p-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <Puzzle size={28} className="text-blue-500" strokeWidth={1.5} />
                </div>
                <p className="font-heading font-bold text-sm text-text-primary">
                  Puzzle de Lógica
                </p>
                <p className="text-[12px] text-muted mt-1">
                  Gana entre 1 y 4 gramos
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Más difícil, mayor recompensa
                </p>
                <button
                  onClick={() => setConfirmGame('PUZZLE')}
                  className="mt-3 bg-blue-500 text-white font-body font-semibold text-sm px-5 py-2.5 rounded-full w-full"
                >
                  Resolver Puzzle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 4 — Weekly challenge ───────────────────────────────── */}
        {challenge && (
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} className="text-brand-gold" />
              <h3 className="font-heading font-semibold text-sm text-text-primary">
                Reto Semanal
              </h3>
            </div>

            <p className="font-body text-sm text-text-primary">{challenge.description}</p>

            {challenge.myProgress?.completed ? (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
                <span className="font-body font-bold text-emerald-600 text-sm">Completado ✓</span>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-body text-muted mb-1">
                    <span>{challenge.myProgress?.purchasesCount ?? 0} de {challenge.requiredPurchases} compras</span>
                    <span>Premio: {challenge.gramReward}g</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-gold transition-all"
                      style={{
                        width: `${Math.min(100, ((challenge.myProgress?.purchasesCount ?? 0) / challenge.requiredPurchases) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Days remaining */}
                {challenge.weekEnd && (
                  <p className="text-[11px] text-muted font-body mt-2">
                    Termina en {Math.max(0, Math.ceil((new Date(challenge.weekEnd).getTime() - now) / (1000 * 60 * 60 * 24)))} días
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SECTION 5 — Gram balance mini-display ──────────────────────── */}
        <Link
          to="/mis-gramos"
          className="flex items-center justify-between bg-surface rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Gem size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="font-body text-sm text-text-primary font-medium">
                Tu saldo actual: <span className="font-heading font-bold text-brand-gold">{gramBalance}g</span> de 13g
              </p>
              <div className="h-1.5 w-32 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-brand-gold rounded-full transition-all"
                  style={{ width: `${Math.min(100, (gramBalance / 13) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </Link>

      </main>

      {/* ── Confirm bottom sheet ───────────────────────────────────────────── */}
      {confirmGame && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setConfirmGame(null)}
        >
          <div
            className="w-full max-w-lg bg-surface rounded-t-2xl p-6 pb-[env(safe-area-inset-bottom)] space-y-4 animate-[slideUp_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-heading font-bold text-base text-text-primary">
                Confirmación de juego
              </p>
              <button onClick={() => setConfirmGame(null)} className="p-1 text-muted" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <p className="font-body text-sm text-muted">
              Usarás 1 de tus {pendingTokens.length} fichas para jugar{' '}
              <span className="font-semibold text-text-primary">
                {confirmGame === 'ROULETTE' ? 'Ruleta' : 'Puzzle'}
              </span>
              . ¿Continuar?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmGame(null)}
                className="flex-1 py-3 rounded-full border-2 border-border font-body font-semibold text-sm text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handlePlay}
                className={clsx(
                  'flex-1 py-3 rounded-full font-heading font-bold text-sm text-white',
                  confirmGame === 'ROULETTE' ? 'bg-brand-pink' : 'bg-blue-500'
                )}
              >
                Jugar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading overlay ────────────────────────────────────────────────── */}
      {isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="text-center">
            <style>{`
              @keyframes spinGame { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
            <Gem
              size={48}
              className="text-brand-gold mx-auto"
              style={{ animation: 'spinGame 1s linear infinite' }}
            />
            <p className="font-heading font-semibold text-text-primary mt-4">Jugando...</p>
          </div>
        </div>
      )}

      {/* ── Result modal ───────────────────────────────────────────────────── */}
      {result && (
        <ResultModal
          gramsWon={result.gramsWon}
          newBalance={result.newBalance}
          ozCompleted={result.ozCompleted}
          onClose={() => setResult(null)}
          onGoToGrams={() => {
            setResult(null);
            navigate('/mis-gramos');
          }}
        />
      )}

      <BottomTabBar pendingGameTokens={pendingTokens.length} />
    </div>
  );
}
