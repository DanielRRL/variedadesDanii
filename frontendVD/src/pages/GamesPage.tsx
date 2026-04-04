/**
 * GamesPage — Game room where users spend game tokens to earn grams.
 *
 * Route: /juegos (ProtectedRoute)
 * Data: GET /api/game-tokens/my, GET /api/challenges/current, GET /api/grams/account
 *
 * Contains three fully interactive visual games:
 *  1. RouletteGame — spinning wheel with CSS animations
 *  2. NumberPuzzleGame — classic 15-puzzle (3×3 with 8 tiles)
 *  3. MemoryGame — card-matching concentration game (4×4, 8 pairs)
 *
 * Prize is ALWAYS determined by the server. Frontend is purely visual.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Gem, Clock, Puzzle, Trophy,
  ChevronRight, X, Brain,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getMyGameTokens, getCurrentChallenge, getMyGramAccount, playGame } from '../services/api';
import { useToastStore } from '../stores/toastStore';
import type { GameToken, WeeklyChallenge } from '../types';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED CSS (injected once)
// ═══════════════════════════════════════════════════════════════════════════════

const GAME_STYLES = `
@keyframes celebratePop {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
}
@keyframes coinPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@keyframes confettiFall {
  0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes popIn {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(249,168,37,0.4); }
  50% { box-shadow: 0 0 24px rgba(249,168,37,0.8); }
}
@keyframes spinBtn {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes tileJump {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFETTI — reusable celebration particles
// ═══════════════════════════════════════════════════════════════════════════════

const CONFETTI_COLORS = ['#D81B60', '#F9A825', '#FFFFFF', '#FF6F91', '#FFC75F', '#FF9671'];

function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 1.5,
        duration: 2 + Math.random() * 2,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 2,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT MODAL — full-screen celebration overlay
// ═══════════════════════════════════════════════════════════════════════════════

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
    timerRef.current = setTimeout(onClose, 8000);
    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm font-body">
      <Confetti />

      <div className="text-center px-6" style={{ animation: 'celebratePop 0.6s ease-out forwards' }}>
        <div className="relative w-28 h-28 mx-auto mb-4">
          <Gem size={54} className="text-brand-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={1.5} />
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

        <p className="font-heading font-extrabold text-[56px] text-white leading-none">
          ¡+{gramsWon}g!
        </p>
        <p className="text-white/80 text-base mt-2">
          Se agregaron {gramsWon} gramos a tu billetera
        </p>

        <div className="mt-5 bg-white/20 rounded-full h-3.5 overflow-hidden mx-auto max-w-64">
          <div
            className="h-full rounded-full bg-brand-gold transition-all duration-700"
            style={{ width: `${Math.min(100, (newBalance / 13) * 100)}%` }}
          />
        </div>
        <p className="text-white/70 text-sm mt-1.5">{newBalance}g de 13g</p>

        {ozCompleted && (
          <div className="mt-4 bg-white/20 rounded-xl px-4 py-3 inline-block">
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

// ═══════════════════════════════════════════════════════════════════════════════
// ROULETTE GAME
// ═══════════════════════════════════════════════════════════════════════════════

const ROULETTE_SEGMENTS = [
  { value: 1, color: '#D81B60' },
  { value: 2, color: '#F9A825' },
  { value: 1, color: '#FFFFFF' },
  { value: 3, color: '#D81B60' },
  { value: 1, color: '#F9A825' },
  { value: 2, color: '#FFFFFF' },
  { value: 1, color: '#D81B60' },
  { value: 3, color: '#F9A825' },
];

function RouletteWheel({ rotation }: { rotation: number }) {
  const count = ROULETTE_SEGMENTS.length;
  const segAngle = 360 / count;
  const r = 140;
  const cx = 150;
  const cy = 150;

  function describeArc(startAngle: number, endAngle: number) {
    const s = ((startAngle - 90) * Math.PI) / 180;
    const e = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;
  }

  return (
    <div className="relative mx-auto" style={{ width: 300, height: 300 }}>
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
        <svg width="30" height="40" viewBox="0 0 30 40">
          <polygon points="15,40 0,0 30,0" fill="#E53935" stroke="#B71C1C" strokeWidth="1" />
        </svg>
      </div>

      {/* Wheel */}
      <svg
        width={300}
        height={300}
        viewBox="0 0 300 300"
        style={{ transform: `rotate(${rotation}deg)`, transition: 'none' }}
      >
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#F9A825" strokeWidth={6} />
        {ROULETTE_SEGMENTS.map((seg, i) => {
          const start = i * segAngle;
          const end = start + segAngle;
          const mid = ((start + segAngle / 2 - 90) * Math.PI) / 180;
          const tx = cx + r * 0.62 * Math.cos(mid);
          const ty = cy + r * 0.62 * Math.sin(mid);
          const isLight = seg.color === '#FFFFFF';
          return (
            <g key={i}>
              <path d={describeArc(start, end)} fill={seg.color} stroke="#F9A825" strokeWidth={1.5} />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="Poppins, sans-serif"
                fontWeight="700"
                fontSize="18"
                fill={isLight ? '#D81B60' : '#FFFFFF'}
                style={{ textShadow: isLight ? 'none' : '0 1px 3px rgba(0,0,0,0.4)' }}
              >
                {seg.value}g
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={22} fill="#1a1a2e" stroke="#F9A825" strokeWidth={2} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Poppins, sans-serif"
          fontWeight="700"
          fontSize="11"
          fill="#F9A825"
        >
          DANII
        </text>
      </svg>
    </div>
  );
}

interface GameProps {
  token: GameToken;
  onComplete: (gramsWon: number, newBalance: number, ozCompleted: boolean) => void;
  onBack: () => void;
}

function RouletteGame({ token, onComplete, onBack }: GameProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const animRef = useRef<number>(0);
  const apiResultRef = useRef<{ gramsWon: number; newBalance: number; ozCompleted: boolean } | null>(null);
  const apiErrorRef = useRef(false);
  const startTimeRef = useRef(0);
  const baseRotRef = useRef(0);

  const handleSpin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setShowConfetti(false);
    apiResultRef.current = null;
    apiErrorRef.current = false;
    startTimeRef.current = performance.now();
    baseRotRef.current = rotation;

    // Fire API immediately
    playGame(token.id, 'ROULETTE')
      .then((res) => {
        const d = res.data;
        apiResultRef.current = {
          gramsWon: d.gramsWon ?? 0,
          newBalance: d.newGramBalance ?? d.newBalance ?? 0,
          ozCompleted: d.ozCompleted ?? false,
        };
      })
      .catch(() => {
        apiErrorRef.current = true;
      });

    // Animate: spin for at least 4 seconds, 4+ full turns
    const baseSpins = 4 * 360 + Math.random() * 360;
    const duration = 5000;
    const startRot = rotation;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (progress < 1 && !apiErrorRef.current) {
        setRotation(startRot + baseSpins * eased);
        animRef.current = requestAnimationFrame(animate);
      } else if (apiErrorRef.current) {
        cancelAnimationFrame(animRef.current);
        setSpinning(false);
        addToast('Error al jugar. La ficha no fue consumida.', 'error');
      } else {
        const currentRot = startRot + baseSpins;
        setRotation(currentRot);
        // Wait for API result
        const waitForApi = () => {
          if (apiResultRef.current) {
            const segAngle = 360 / ROULETTE_SEGMENTS.length;
            const targetValue = apiResultRef.current.gramsWon;
            const matchIdx = ROULETTE_SEGMENTS.findIndex((s) => s.value === targetValue);
            const idx = matchIdx >= 0 ? matchIdx : 0;
            const segCenter = idx * segAngle + segAngle / 2;
            const finalRot = Math.ceil(currentRot / 360) * 360 + (360 - segCenter);
            setRotation(finalRot);
            setTimeout(() => {
              setShowConfetti(true);
              setTimeout(() => {
                onComplete(
                  apiResultRef.current!.gramsWon,
                  apiResultRef.current!.newBalance,
                  apiResultRef.current!.ozCompleted,
                );
              }, 1200);
            }, 600);
          } else if (apiErrorRef.current) {
            setSpinning(false);
            addToast('Error al jugar. La ficha no fue consumida.', 'error');
          } else {
            setTimeout(waitForApi, 100);
          }
        };
        waitForApi();
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [spinning, rotation, token.id, onComplete, addToast]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  return (
    <div className="fixed inset-0 z-40 bg-[#0a0a0a] flex flex-col items-center justify-center font-body overflow-hidden">
      {showConfetti && <Confetti />}

      <button
        onClick={onBack}
        disabled={spinning}
        className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50"
      >
        <X size={24} />
      </button>

      <h2 className="font-heading font-bold text-2xl text-white mb-2">Ruleta de la Suerte</h2>
      <p className="text-white/60 text-sm mb-6">¡Gira para ganar gramos!</p>

      <RouletteWheel rotation={rotation} />

      <button
        onClick={handleSpin}
        disabled={spinning}
        className={clsx(
          'mt-8 font-heading font-bold text-lg px-12 py-4 rounded-full text-white transition-all',
          spinning
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-brand-pink shadow-[0_0_20px_rgba(216,27,96,0.5)]',
        )}
        style={!spinning ? { animation: 'spinBtn 1.5s ease-in-out infinite' } : undefined}
      >
        {spinning ? 'Girando...' : '¡GIRAR!'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER PUZZLE GAME (3×3 slide puzzle)
// ═══════════════════════════════════════════════════════════════════════════════

const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];

function shufflePuzzle(): number[] {
  const tiles = [...SOLVED];
  let emptyIdx = 8;
  const dirs = [-1, 1, -3, 3];
  for (let i = 0; i < 200; i++) {
    const validMoves = dirs
      .map((d) => emptyIdx + d)
      .filter((ni) => {
        if (ni < 0 || ni > 8) return false;
        if (Math.abs(emptyIdx % 3 - ni % 3) > 1) return false;
        return true;
      });
    const pick = validMoves[Math.floor(Math.random() * validMoves.length)];
    tiles[emptyIdx] = tiles[pick];
    tiles[pick] = 0;
    emptyIdx = pick;
  }
  return tiles;
}

function isSolved(tiles: number[]): boolean {
  return tiles.every((v, i) => v === SOLVED[i]);
}

function NumberPuzzleGame({ token, onComplete, onBack }: GameProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [tiles, setTiles] = useState(() => shufflePuzzle());
  const [moves, setMoves] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (won) return;
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(timerRef.current);
  }, [startTime, won]);

  const handleTap = useCallback(
    (idx: number) => {
      if (won) return;
      const emptyIdx = tiles.indexOf(0);
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const eRow = Math.floor(emptyIdx / 3);
      const eCol = emptyIdx % 3;
      const isAdjacent =
        (row === eRow && Math.abs(col - eCol) === 1) ||
        (col === eCol && Math.abs(row - eRow) === 1);
      if (!isAdjacent) return;

      const next = [...tiles];
      next[emptyIdx] = next[idx];
      next[idx] = 0;
      setTiles(next);
      setMoves((m) => m + 1);

      if (isSolved(next)) {
        setWon(true);
        clearInterval(timerRef.current);
        setCelebrating(true);

        playGame(token.id, 'PUZZLE')
          .then((res) => {
            const d = res.data;
            setTimeout(() => {
              onComplete(d.gramsWon ?? 0, d.newGramBalance ?? d.newBalance ?? 0, d.ozCompleted ?? false);
            }, 2000);
          })
          .catch(() => {
            setCelebrating(false);
            setWon(false);
            addToast('Error al jugar. La ficha no fue consumida.', 'error');
          });
      }
    },
    [tiles, won, token.id, onComplete, addToast],
  );

  const handleShuffle = () => {
    setTiles(shufflePuzzle());
    setMoves(0);
  };

  const secs = (elapsed / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-40 bg-[#0a0a0a] flex flex-col items-center justify-center font-body overflow-hidden">
      {celebrating && <Confetti />}

      <button
        onClick={onBack}
        disabled={won}
        className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50"
      >
        <X size={24} />
      </button>

      <h2 className="font-heading font-bold text-2xl text-white mb-1">Puzzle Numérico</h2>
      <p className="text-white/60 text-sm mb-4">Ordena los números del 1 al 8</p>

      <div className="flex gap-6 mb-5 text-white/80 text-sm font-body">
        <span>⏱ {secs}s</span>
        <span>🔄 {moves} movimientos</span>
      </div>

      <div
        className="grid grid-cols-3 gap-2 p-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {tiles.map((val, idx) => (
          <button
            key={idx}
            onClick={() => handleTap(idx)}
            disabled={val === 0 || won}
            className={clsx(
              'w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-xl font-heading font-bold text-2xl transition-all duration-150',
              val === 0
                ? 'bg-transparent'
                : won
                  ? 'bg-gradient-to-br from-brand-pink to-brand-gold text-white shadow-lg'
                  : 'bg-[#1a1a2e] text-white hover:bg-[#2a2a4e] active:scale-95 shadow-md',
            )}
            style={
              won && val !== 0
                ? { animation: `tileJump 0.5s ease-in-out ${idx * 0.08}s` }
                : undefined
            }
          >
            {val !== 0 ? val : ''}
          </button>
        ))}
      </div>

      {!won && (
        <button
          onClick={handleShuffle}
          className="mt-6 text-white/60 hover:text-white text-sm underline font-body"
        >
          Mezclar de nuevo
        </button>
      )}

      {won && (
        <p
          className="mt-6 font-heading font-bold text-xl text-brand-gold"
          style={{ animation: 'popIn 0.5s ease-out forwards' }}
        >
          ¡Lo lograste en {secs}s!
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY GAME (4×4 card matching)
// ═══════════════════════════════════════════════════════════════════════════════

const MEMORY_EMOJIS = ['🌸', '🌹', '🌺', '🌻', '🌷', '💐', '🪷', '✨'];

interface MemoryCard {
  id: number;
  emoji: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

function createMemoryDeck(): MemoryCard[] {
  const pairs: MemoryCard[] = [];
  MEMORY_EMOJIS.forEach((emoji, i) => {
    pairs.push({ id: i * 2, emoji, pairId: i, flipped: false, matched: false });
    pairs.push({ id: i * 2 + 1, emoji, pairId: i, flipped: false, matched: false });
  });
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

function MemoryGame({ token, onComplete, onBack }: GameProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [cards, setCards] = useState(() => createMemoryDeck());
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [shakeIds, setShakeIds] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (won) return;
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(timerRef.current);
  }, [startTime, won]);

  const handleFlip = useCallback(
    (idx: number) => {
      if (locked || won) return;
      const card = cards[idx];
      if (card.flipped || card.matched) return;

      const next = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
      setCards(next);

      const newSelected = [...selected, idx];
      setSelected(newSelected);

      if (newSelected.length === 2) {
        setLocked(true);
        const [a, b] = newSelected;
        const cardA = next[a];
        const cardB = next[b];

        if (cardA.pairId === cardB.pairId) {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.pairId === cardA.pairId ? { ...c, matched: true, flipped: true } : c,
              ),
            );
            const newMatched = matchedPairs + 1;
            setMatchedPairs(newMatched);
            setSelected([]);
            setLocked(false);

            if (newMatched === 8) {
              setWon(true);
              clearInterval(timerRef.current);
              playGame(token.id, 'PUZZLE')
                .then((res) => {
                  const d = res.data;
                  setTimeout(() => {
                    onComplete(d.gramsWon ?? 0, d.newGramBalance ?? d.newBalance ?? 0, d.ozCompleted ?? false);
                  }, 2000);
                })
                .catch(() => {
                  addToast('Error al jugar. La ficha no fue consumida.', 'error');
                });
            }
          }, 400);
        } else {
          setShakeIds([a, b]);
          setTimeout(() => {
            setShakeIds([]);
            setCards((prev) =>
              prev.map((c, i) =>
                i === a || i === b ? { ...c, flipped: false } : c,
              ),
            );
            setSelected([]);
            setLocked(false);
          }, 800);
        }
      }
    },
    [cards, selected, locked, won, matchedPairs, token.id, onComplete, addToast],
  );

  const secs = (elapsed / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-40 bg-[#0a0a0a] flex flex-col items-center justify-center font-body overflow-hidden">
      {won && <Confetti />}

      <button
        onClick={onBack}
        disabled={won}
        className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50"
      >
        <X size={24} />
      </button>

      <h2 className="font-heading font-bold text-2xl text-white mb-1">Memoria</h2>
      <p className="text-white/60 text-sm mb-4">Encuentra los 8 pares de flores</p>

      <div className="flex gap-6 mb-5 text-white/80 text-sm font-body">
        <span>⏱ {secs}s</span>
        <span>✓ {matchedPairs}/8 pares</span>
      </div>

      <div className="grid grid-cols-4 gap-2 p-2">
        {cards.map((card, idx) => {
          const isShaking = shakeIds.includes(idx);
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(idx)}
              className="relative"
              style={{
                width: 70,
                height: 70,
                perspective: 600,
                animation: isShaking ? 'shake 0.4s ease-in-out' : undefined,
              }}
            >
              <div
                className="absolute inset-0 transition-transform duration-300"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: card.flipped || card.matched ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front (face down) */}
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    background: 'linear-gradient(135deg, #1a1a2e, #2a2a4e)',
                    border: '2px solid rgba(249,168,37,0.3)',
                  }}
                >
                  <span className="font-heading font-bold text-brand-gold/60 text-xs">D</span>
                </div>

                {/* Back (face up) */}
                <div
                  className={clsx(
                    'absolute inset-0 rounded-xl flex items-center justify-center text-3xl',
                    card.matched && 'ring-2 ring-brand-gold',
                  )}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: card.matched
                      ? 'linear-gradient(135deg, #D81B60, #F9A825)'
                      : 'linear-gradient(135deg, #2a1a3e, #3a2a5e)',
                    animation: card.matched ? 'glowPulse 2s ease-in-out infinite' : undefined,
                  }}
                >
                  {card.emoji}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {won && (
        <p
          className="mt-6 font-heading font-bold text-xl text-brand-gold"
          style={{ animation: 'popIn 0.5s ease-out forwards' }}
        >
          ¡Memoria perfecta en {secs}s!
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME SELECTOR — card-based game picker
// ═══════════════════════════════════════════════════════════════════════════════

type GameType = 'roulette' | 'puzzle' | 'memory';

interface GameSelectorProps {
  onSelect: (game: GameType) => void;
}

function GameSelector({ onSelect }: GameSelectorProps) {
  const games: { type: GameType; icon: React.ReactNode; name: string; desc: string; range: string; color: string; bg: string }[] = [
    {
      type: 'roulette',
      icon: <Gem size={28} className="text-brand-gold" strokeWidth={1.5} />,
      name: 'Ruleta de la Suerte',
      desc: 'Gira y descubre tu premio',
      range: '1-3 gramos',
      color: 'bg-brand-pink',
      bg: 'bg-brand-gold/10',
    },
    {
      type: 'puzzle',
      icon: <Puzzle size={28} className="text-blue-400" strokeWidth={1.5} />,
      name: 'Puzzle Numérico',
      desc: 'Ordena los números',
      range: '1-4 gramos',
      color: 'bg-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      type: 'memory',
      icon: <Brain size={28} className="text-purple-400" strokeWidth={1.5} />,
      name: 'Memoria',
      desc: 'Encuentra los pares',
      range: '1-4 gramos',
      color: 'bg-purple-500',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="font-heading font-bold text-lg text-text-primary">¿Cómo quieres jugar?</h2>
      <div className="grid grid-cols-1 gap-3">
        {games.map((g) => (
          <button
            key={g.type}
            onClick={() => onSelect(g.type)}
            className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4 text-left hover:shadow-md transition-shadow active:scale-[0.98]"
          >
            <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center flex-none', g.bg)}>
              {g.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm text-text-primary">{g.name}</p>
              <p className="text-[12px] text-muted mt-0.5">{g.desc}</p>
              <p className="text-[11px] text-muted mt-0.5">Premio: {g.range}</p>
            </div>
            <div className={clsx('px-4 py-2 rounded-full text-white font-heading font-bold text-sm flex-none', g.color)}>
              Jugar
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

type PageState = 'idle' | 'roulette' | 'puzzle' | 'memory' | 'result';

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
  const [pageState, setPageState] = useState<PageState>('idle');
  const [result, setResult] = useState<{
    gramsWon: number; newBalance: number; ozCompleted: boolean;
  } | null>(null);

  const gameSelectorRef = useRef<HTMLDivElement>(null);

  // ── Derived ─────────────────────────────────────────────────────────────
  const now = Date.now();
  const expiringTokens = pendingTokens.filter(
    (t) => new Date(t.expiresAt).getTime() - now < 12 * 60 * 60 * 1000,
  );

  const activeToken = useMemo(() => {
    if (pendingTokens.length === 0) return null;
    return [...pendingTokens].sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    )[0];
  }, [pendingTokens]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const scrollToGames = () => {
    gameSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectGame = (game: GameType) => {
    if (!activeToken) {
      addToast('No tienes fichas disponibles', 'error');
      return;
    }
    setPageState(game);
  };

  const handleGameComplete = (gramsWon: number, newBalance: number, ozCompleted: boolean) => {
    setResult({ gramsWon, newBalance, ozCompleted });
    setPageState('result');
    queryClient.invalidateQueries({ queryKey: ['my-game-tokens'] });
    queryClient.invalidateQueries({ queryKey: ['gram-account'] });
  };

  const handleBackFromGame = () => {
    setPageState('idle');
  };

  const handleResultClose = () => {
    setResult(null);
    setPageState('idle');
  };

  // ── Full-screen game views (hide AppBar + BottomTabBar) ────────────────
  if (pageState === 'roulette' && activeToken) {
    return (
      <>
        <style>{GAME_STYLES}</style>
        <RouletteGame token={activeToken} onComplete={handleGameComplete} onBack={handleBackFromGame} />
      </>
    );
  }

  if (pageState === 'puzzle' && activeToken) {
    return (
      <>
        <style>{GAME_STYLES}</style>
        <NumberPuzzleGame token={activeToken} onComplete={handleGameComplete} onBack={handleBackFromGame} />
      </>
    );
  }

  if (pageState === 'memory' && activeToken) {
    return (
      <>
        <style>{GAME_STYLES}</style>
        <MemoryGame token={activeToken} onComplete={handleGameComplete} onBack={handleBackFromGame} />
      </>
    );
  }

  // ── Render main page ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background font-body pb-24">
      <style>{GAME_STYLES}</style>
      <AppBar title="Sala de Juegos" showBack />

      <main className="px-4 py-4 space-y-5">

        {/* ── SECTION 1 — Pending tokens header ──────────────────────────── */}
        <div className="text-center py-6">
          {tokensLoading ? (
            <div className="w-16 h-16 rounded-full bg-border animate-pulse mx-auto" />
          ) : pendingTokens.length > 0 ? (
            <>
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
              <p className="font-body text-muted text-sm mt-1.5 max-w-65 mx-auto">
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
          <div ref={gameSelectorRef}>
            <GameSelector onSelect={handleSelectGame} />
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

      {/* ── Result modal ───────────────────────────────────────────────────── */}
      {pageState === 'result' && result && (
        <ResultModal
          gramsWon={result.gramsWon}
          newBalance={result.newBalance}
          ozCompleted={result.ozCompleted}
          onClose={handleResultClose}
          onGoToGrams={() => {
            handleResultClose();
            navigate('/mis-gramos');
          }}
        />
      )}

      <BottomTabBar pendingGameTokens={pendingTokens.length} />
    </div>
  );
}
