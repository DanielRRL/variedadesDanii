/**
 * GamesPage — Casino-style game room where users spend game tokens to earn grams.
 *
 * Route: /juegos (ProtectedRoute)
 * Data: GET /api/game-tokens/my, GET /api/challenges/current, GET /api/grams/account
 *
 * Contains five fully interactive visual games:
 *  1. RouletteGame — spinning neon wheel
 *  2. NumberPuzzleGame — classic 15-puzzle (4x4)
 *  3. MemoryGame — card-matching (5x4, 10 pairs)
 *  4. ScratchCardGame — scratch-to-reveal canvas
 *  5. DiceGame — animated dice roll
 *
 * Prize is ALWAYS determined by the server. Frontend is purely visual.
 * Dark neon casino aesthetic with heavy dopamine-inducing visual stimuli.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Gem, Clock, Puzzle, Trophy,
  ChevronRight, X, Brain, Sparkles, Dice5, Lock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getMyGameTokens, getCurrentChallenge, getMyGramAccount, playGame } from '../services/api';
import { useToastStore } from '../stores/toastStore';
import type { GameToken, WeeklyChallenge } from '../types';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';

// ═══════════════════════════════════════════════════════════════════════════════
// CASINO CSS — neon glow, animated particles, dopamine-heavy effects
// ═══════════════════════════════════════════════════════════════════════════════

const CASINO_STYLES = `
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
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(249,168,37,0.3)); }
  50% { transform: scale(1.15); filter: drop-shadow(0 0 20px rgba(249,168,37,0.8)); }
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
  0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(216,27,96,0.4); }
  50% { transform: scale(1.06); box-shadow: 0 0 30px rgba(216,27,96,0.8); }
}
@keyframes tileJump {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes neonFlicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; text-shadow: 0 0 10px #F9A825, 0 0 20px #F9A825, 0 0 40px #F9A825; }
  20%, 24%, 55% { opacity: 0.7; text-shadow: none; }
}
@keyframes floatParticle {
  0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.6; }
  100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
}
@keyframes cardGlow {
  0%, 100% { box-shadow: 0 0 5px rgba(216,27,96,0.3), inset 0 0 5px rgba(216,27,96,0.1); }
  50% { box-shadow: 0 0 20px rgba(216,27,96,0.6), inset 0 0 10px rgba(216,27,96,0.2); }
}
@keyframes jackpotFlash {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes bounceIn {
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  60% { transform: scale(1.2) rotate(3deg); }
  80% { transform: scale(0.95) rotate(-1deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes pulseRing {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes diceShake {
  0%,100% { transform: rotate(0deg) scale(1); }
  10% { transform: rotate(-15deg) scale(1.1); }
  20% { transform: rotate(15deg) scale(0.95); }
  30% { transform: rotate(-10deg) scale(1.05); }
  40% { transform: rotate(10deg) scale(1); }
  50% { transform: rotate(-5deg) scale(1.08); }
  60% { transform: rotate(5deg) scale(0.98); }
  70% { transform: rotate(-3deg) scale(1.02); }
  80% { transform: rotate(3deg) scale(1); }
  90% { transform: rotate(-1deg) scale(1.01); }
}
@keyframes scratchShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING NEON PARTICLES — background casino ambience
// ═══════════════════════════════════════════════════════════════════════════════

const PARTICLE_COLORS = ['#D81B60', '#F9A825', '#00E5FF', '#76FF03', '#FF6F91', '#E040FB'];

function FloatingParticles({ count = 20 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 6,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        delay: Math.random() * 8,
        duration: 8 + Math.random() * 12,
      })),
    [count],
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animation: `floatParticle ${p.duration}s linear ${p.delay}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFETTI — celebration blast
// ═══════════════════════════════════════════════════════════════════════════════

const CONFETTI_COLORS = ['#D81B60', '#F9A825', '#00E5FF', '#76FF03', '#FF6F91', '#FFC75F', '#E040FB'];

function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 10,
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
          className="absolute"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            borderRadius: '2px',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT MODAL — neon jackpot-style win screen
// ═══════════════════════════════════════════════════════════════════════════════

interface ResultModalProps {
  gramsWon: number;
  newBalance: number;
  ozCompleted: boolean;
  onClose: () => void;
  onGoToGrams: () => void;
}

function ResultModal({ gramsWon, newBalance, ozCompleted, onClose, onGoToGrams }: ResultModalProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);
  useEffect(() => {
    const t = setTimeout(onClose, 10000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Confetti />
      <div
        className={clsx(
          'relative w-[90%] max-w-sm rounded-3xl p-6 text-center transition-all duration-500',
          visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
        )}
        style={{
          background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0d1a 50%, #1a0a2e 100%)',
          border: '2px solid rgba(249,168,37,0.5)',
          boxShadow: '0 0 40px rgba(249,168,37,0.3), inset 0 0 40px rgba(216,27,96,0.1)',
        }}
      >
        <div className="absolute inset-0 rounded-3xl" style={{ animation: 'pulseRing 2s ease-out infinite', border: '2px solid rgba(249,168,37,0.3)' }} />

        <div className="relative z-10">
          <p className="text-5xl mb-2" style={{ animation: 'bounceIn 0.8s ease-out' }}>🎰</p>
          <h2
            className="font-heading font-bold text-3xl mb-1"
            style={{
              background: 'linear-gradient(90deg, #F9A825, #FF6F91, #F9A825)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'jackpotFlash 2s linear infinite',
            }}
          >
            ¡GANASTE!
          </h2>
          <p
            className="font-heading font-bold text-6xl my-3"
            style={{ color: '#F9A825', animation: 'popIn 0.6s ease-out 0.3s both', textShadow: '0 0 20px rgba(249,168,37,0.5)' }}
          >
            +{gramsWon}g
          </p>

          {ozCompleted && (
            <div
              className="mx-auto mb-4 px-5 py-2 rounded-full text-sm font-bold"
              style={{
                background: 'linear-gradient(90deg, #D81B60, #F9A825)',
                animation: 'bounceIn 0.6s ease-out 0.5s both',
                boxShadow: '0 0 20px rgba(216,27,96,0.5)',
              }}
            >
              <span className="text-white">🏆 ¡COMPLETASTE 1 OZ DE ESENCIA!</span>
            </div>
          )}

          <div className="mt-4 mb-5">
            <div className="flex justify-between text-xs font-body text-white/60 mb-1">
              <span>Gramos</span>
              <span className="font-bold" style={{ color: '#F9A825' }}>{newBalance}g / 13g</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, (newBalance / 13) * 100)}%`,
                  background: 'linear-gradient(90deg, #D81B60, #F9A825)',
                  boxShadow: '0 0 10px rgba(249,168,37,0.5)',
                }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-full font-heading font-bold text-sm text-white/70 border border-white/20 hover:border-white/40 transition-colors"
            >
              Seguir jugando
            </button>
            <button
              onClick={onGoToGrams}
              className="flex-1 py-3 rounded-full font-heading font-bold text-sm text-white"
              style={{
                background: 'linear-gradient(90deg, #D81B60, #F9A825)',
                boxShadow: '0 0 15px rgba(216,27,96,0.4)',
              }}
            >
              Ver gramos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED GAME PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface GameProps {
  token: GameToken;
  onComplete: (gramsWon: number, newBalance: number, ozCompleted: boolean) => void;
  onBack: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROULETTE GAME — neon spinning wheel
// ═══════════════════════════════════════════════════════════════════════════════

const ROULETTE_SEGMENTS = [
  { grams: 1, label: '1g', color: '#D81B60' },
  { grams: 2, label: '2g', color: '#F9A825' },
  { grams: 1, label: '1g', color: '#7B1FA2' },
  { grams: 3, label: '3g', color: '#00E5FF' },
  { grams: 1, label: '1g', color: '#D81B60' },
  { grams: 2, label: '2g', color: '#F9A825' },
  { grams: 1, label: '1g', color: '#7B1FA2' },
  { grams: 3, label: '¡3g!', color: '#76FF03' },
];

function RouletteWheel({ rotation }: { rotation: number }) {
  const n = ROULETTE_SEGMENTS.length;
  const angle = 360 / n;
  const r = 130;

  return (
    <div className="relative" style={{ width: r * 2, height: r * 2 }}>
      <div
        className="absolute -inset-3 rounded-full"
        style={{ boxShadow: '0 0 30px rgba(216,27,96,0.4), 0 0 60px rgba(249,168,37,0.2)', animation: 'cardGlow 3s ease-in-out infinite' }}
      />
      <svg
        viewBox={`0 0 ${r * 2} ${r * 2}`}
        className="w-full h-full drop-shadow-2xl"
        style={{ transform: `rotate(${rotation}deg)`, transition: rotation === 0 ? 'none' : 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' }}
      >
        {ROULETTE_SEGMENTS.map((seg, i) => {
          const startAngle = (i * angle * Math.PI) / 180;
          const endAngle = ((i + 1) * angle * Math.PI) / 180;
          const x1 = r + r * Math.cos(startAngle);
          const y1 = r + r * Math.sin(startAngle);
          const x2 = r + r * Math.cos(endAngle);
          const y2 = r + r * Math.sin(endAngle);
          const midAngle = ((i + 0.5) * angle * Math.PI) / 180;
          const tx = r + r * 0.65 * Math.cos(midAngle);
          const ty = r + r * 0.65 * Math.sin(midAngle);
          return (
            <g key={i}>
              <path
                d={`M${r},${r} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
                fill={seg.color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="1"
              />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontWeight="bold"
                fontSize="16"
                style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
                transform={`rotate(${(i + 0.5) * angle}, ${tx}, ${ty})`}
              >
                {seg.label}
              </text>
            </g>
          );
        })}
        <circle cx={r} cy={r} r="22" fill="url(#centerGrad)" stroke="#F9A825" strokeWidth="3" />
        <defs>
          <radialGradient id="centerGrad">
            <stop offset="0%" stopColor="#2a1040" />
            <stop offset="100%" stopColor="#0d0d1a" />
          </radialGradient>
        </defs>
        <text x={r} y={r} textAnchor="middle" dominantBaseline="central" fill="#F9A825" fontWeight="bold" fontSize="14" style={{ textShadow: '0 0 10px #F9A825' }}>D</text>
      </svg>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <div className="w-0 h-0" style={{ borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid #F9A825', filter: 'drop-shadow(0 0 8px #F9A825)' }} />
      </div>
    </div>
  );
}

function RouletteGame({ token, onComplete, onBack }: GameProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState(false);

  const handleSpin = useCallback(() => {
    if (spinning || won) return;
    setSpinning(true);

    playGame(token.id, 'ROULETTE')
      .then((res) => {
        const d = res.data;
        const grams = d.gramsWon ?? 0;
        const segIndex = ROULETTE_SEGMENTS.findIndex((s) => s.grams === grams);
        const segAngle = 360 / ROULETTE_SEGMENTS.length;
        const targetAngle = 360 - (segIndex * segAngle + segAngle / 2) - 90;
        const fullSpins = 360 * (6 + Math.floor(Math.random() * 3));
        setRotation(fullSpins + targetAngle);

        setTimeout(() => {
          setWon(true);
          setSpinning(false);
          setTimeout(() => {
            onComplete(grams, d.newGramBalance ?? d.newBalance ?? 0, d.ozCompleted ?? false);
          }, 1500);
        }, 5200);
      })
      .catch(() => {
        setSpinning(false);
        addToast('Error al jugar. La ficha no fue consumida.', 'error');
      });
  }, [spinning, won, token.id, onComplete, addToast]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center font-body overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a12 100%)' }}>
      <FloatingParticles count={15} />
      {won && <Confetti />}

      <button onClick={onBack} disabled={spinning || won} className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50">
        <X size={24} />
      </button>

      <h2 className="font-heading font-bold text-2xl text-white mb-1 relative z-10" style={{ animation: 'neonFlicker 3s ease-in-out infinite' }}>
        🎰 Ruleta de la Suerte
      </h2>
      <p className="text-white/50 text-sm mb-6 relative z-10">Gira para ganar hasta 3 gramos</p>

      <div className="relative z-10 mb-8">
        <RouletteWheel rotation={rotation} />
      </div>

      {!won && (
        <button
          onClick={handleSpin}
          disabled={spinning}
          className={clsx(
            'relative z-10 px-10 py-4 rounded-full font-heading font-bold text-lg text-white transition-all',
            spinning ? 'bg-gray-700 cursor-not-allowed' : '',
          )}
          style={spinning ? undefined : {
            background: 'linear-gradient(90deg, #D81B60, #F9A825)',
            animation: 'spinBtn 2s ease-in-out infinite',
          }}
        >
          {spinning ? '✨ Girando...' : '🎰 ¡GIRAR!'}
        </button>
      )}

      {won && (
        <p className="relative z-10 mt-4 font-heading font-bold text-2xl" style={{ color: '#F9A825', animation: 'popIn 0.5s ease-out forwards', textShadow: '0 0 20px rgba(249,168,37,0.5)' }}>
          ¡Premio revelado!
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER PUZZLE GAME (4x4, 15 tiles) — harder difficulty
// ═══════════════════════════════════════════════════════════════════════════════

const PUZZLE_SIZE = 4;
const PUZZLE_TILES = PUZZLE_SIZE * PUZZLE_SIZE;

function shufflePuzzle(): number[] {
  const tiles = Array.from({ length: PUZZLE_TILES }, (_, i) => (i + 1) % PUZZLE_TILES);
  let blankIdx = PUZZLE_TILES - 1;
  const moves = 400 + Math.floor(Math.random() * 200);
  for (let m = 0; m < moves; m++) {
    const neighbors: number[] = [];
    const row = Math.floor(blankIdx / PUZZLE_SIZE);
    const col = blankIdx % PUZZLE_SIZE;
    if (row > 0) neighbors.push(blankIdx - PUZZLE_SIZE);
    if (row < PUZZLE_SIZE - 1) neighbors.push(blankIdx + PUZZLE_SIZE);
    if (col > 0) neighbors.push(blankIdx - 1);
    if (col < PUZZLE_SIZE - 1) neighbors.push(blankIdx + 1);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blankIdx], tiles[pick]] = [tiles[pick], tiles[blankIdx]];
    blankIdx = pick;
  }
  return tiles;
}

function isSolved(tiles: number[]): boolean {
  for (let i = 0; i < PUZZLE_TILES - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[PUZZLE_TILES - 1] === 0;
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
      const blankIdx = tiles.indexOf(0);
      const rowT = Math.floor(idx / PUZZLE_SIZE);
      const colT = idx % PUZZLE_SIZE;
      const rowB = Math.floor(blankIdx / PUZZLE_SIZE);
      const colB = blankIdx % PUZZLE_SIZE;
      const isAdj = (rowT === rowB && Math.abs(colT - colB) === 1) || (colT === colB && Math.abs(rowT - rowB) === 1);
      if (!isAdj) return;

      const next = [...tiles];
      [next[idx], next[blankIdx]] = [next[blankIdx], next[idx]];
      setTiles(next);
      setMoves((m) => m + 1);

      if (isSolved(next)) {
        setWon(true);
        setCelebrating(true);
        clearInterval(timerRef.current);
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
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center font-body overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #0a1628 0%, #0a0a12 100%)' }}>
      <FloatingParticles count={12} />
      {celebrating && <Confetti />}

      <button onClick={onBack} disabled={won} className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50">
        <X size={24} />
      </button>

      <h2 className="font-heading font-bold text-2xl text-white mb-1 relative z-10" style={{ textShadow: '0 0 15px rgba(0,229,255,0.5)' }}>
        🧩 Puzzle 15
      </h2>
      <p className="text-white/50 text-sm mb-4 relative z-10">Ordena los números del 1 al 15</p>

      <div className="flex gap-6 mb-4 text-white/70 text-sm font-body relative z-10">
        <span className="px-3 py-1 rounded-full" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)' }}>⏱ {secs}s</span>
        <span className="px-3 py-1 rounded-full" style={{ background: 'rgba(118,255,3,0.1)', border: '1px solid rgba(118,255,3,0.3)' }}>🔄 {moves}</span>
      </div>

      <div
        className="grid gap-1.5 p-2 rounded-xl relative z-10"
        style={{ gridTemplateColumns: `repeat(${PUZZLE_SIZE}, 1fr)`, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {tiles.map((val, idx) => (
          <button
            key={idx}
            onClick={() => handleTap(idx)}
            disabled={val === 0 || won}
            className={clsx(
              'w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl font-heading font-bold text-xl transition-all duration-150',
              val === 0
                ? 'bg-transparent'
                : won
                  ? 'text-white'
                  : 'text-white hover:brightness-125 active:scale-95',
            )}
            style={
              val === 0 ? undefined :
              won ? {
                background: 'linear-gradient(135deg, #D81B60, #F9A825)',
                boxShadow: '0 0 15px rgba(249,168,37,0.4)',
                animation: `tileJump 0.5s ease-in-out ${idx * 0.05}s`,
              } : {
                background: 'linear-gradient(135deg, #1a1a3e, #2a2a5e)',
                border: '1px solid rgba(0,229,255,0.2)',
                boxShadow: '0 0 8px rgba(0,229,255,0.1)',
              }
            }
          >
            {val !== 0 ? val : ''}
          </button>
        ))}
      </div>

      {!won && (
        <button onClick={handleShuffle} className="relative z-10 mt-5 text-white/50 hover:text-white text-sm underline font-body">
          Mezclar de nuevo
        </button>
      )}

      {won && (
        <p className="relative z-10 mt-5 font-heading font-bold text-xl" style={{ color: '#00E5FF', animation: 'popIn 0.5s ease-out forwards', textShadow: '0 0 15px rgba(0,229,255,0.5)' }}>
          ¡Resuelto en {moves} movimientos!
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY GAME (5x4, 10 pairs) — harder difficulty
// ═══════════════════════════════════════════════════════════════════════════════

const MEMORY_EMOJIS = ['🎰', '💎', '🃏', '🎲', '👑', '🔥', '⚡', '🌟', '🎯', '🏆'];
const MEMORY_PAIRS = 10;
const MEMORY_COLS = 5;

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

            if (newMatched === MEMORY_PAIRS) {
              setWon(true);
              clearInterval(timerRef.current);
              playGame(token.id, 'MEMORY')
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
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center font-body overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #1a0a28 0%, #0a0a12 100%)' }}>
      <FloatingParticles count={12} />
      {won && <Confetti />}

      <button onClick={onBack} disabled={won} className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50">
        <X size={24} />
      </button>

      <h2 className="font-heading font-bold text-2xl text-white mb-1 relative z-10" style={{ textShadow: '0 0 15px rgba(224,64,251,0.5)' }}>
        🃏 Memoria Casino
      </h2>
      <p className="text-white/50 text-sm mb-3 relative z-10">Encuentra los {MEMORY_PAIRS} pares</p>

      <div className="flex gap-4 mb-4 text-white/70 text-sm font-body relative z-10">
        <span className="px-3 py-1 rounded-full" style={{ background: 'rgba(224,64,251,0.1)', border: '1px solid rgba(224,64,251,0.3)' }}>⏱ {secs}s</span>
        <span className="px-3 py-1 rounded-full" style={{ background: 'rgba(249,168,37,0.1)', border: '1px solid rgba(249,168,37,0.3)' }}>✓ {matchedPairs}/{MEMORY_PAIRS}</span>
      </div>

      <div className="relative z-10 p-2" style={{ display: 'grid', gridTemplateColumns: `repeat(${MEMORY_COLS}, 1fr)`, gap: '6px' }}>
        {cards.map((card, idx) => {
          const isShaking = shakeIds.includes(idx);
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(idx)}
              className="relative"
              style={{
                width: 58,
                height: 58,
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
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    background: 'linear-gradient(135deg, #1a1a3e, #2a2050)',
                    border: '1.5px solid rgba(224,64,251,0.3)',
                    boxShadow: '0 0 8px rgba(224,64,251,0.15)',
                  }}
                >
                  <span className="font-heading font-bold text-xs" style={{ color: 'rgba(224,64,251,0.5)' }}>D</span>
                </div>
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center text-2xl"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: card.matched
                      ? 'linear-gradient(135deg, #D81B60, #F9A825)'
                      : 'linear-gradient(135deg, #2a1a40, #3a2a60)',
                    border: card.matched ? '1.5px solid #F9A825' : '1.5px solid rgba(224,64,251,0.4)',
                    boxShadow: card.matched ? '0 0 15px rgba(249,168,37,0.4)' : '0 0 5px rgba(224,64,251,0.2)',
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
        <p className="relative z-10 mt-5 font-heading font-bold text-xl" style={{ color: '#E040FB', animation: 'popIn 0.5s ease-out forwards', textShadow: '0 0 15px rgba(224,64,251,0.5)' }}>
          ¡Memoria perfecta en {secs}s!
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRATCH CARD GAME (raspadita)
// ═══════════════════════════════════════════════════════════════════════════════

function ScratchCardGame({ token, onComplete, onBack }: GameProps) {
  const addToast = useToastStore((s) => s.addToast);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scratched, setScratched] = useState(0);
  const [won, setWon] = useState(false);
  const [prizeText, setPrizeText] = useState('');
  const [celebrating, setCelebrating] = useState(false);
  const isDrawingRef = useRef(false);
  const calledApiRef = useRef(false);
  const resultRef = useRef<{ grams: number; balance: number; oz: boolean } | null>(null);

  useEffect(() => {
    if (calledApiRef.current) return;
    calledApiRef.current = true;
    playGame(token.id, 'SCRATCH')
      .then((res) => {
        const d = res.data;
        const grams = d.gramsWon ?? 0;
        setPrizeText(`¡${grams}g!`);
        resultRef.current = { grams, balance: d.newGramBalance ?? d.newBalance ?? 0, oz: d.ozCompleted ?? false };
      })
      .catch(() => {
        setPrizeText('Error');
        addToast('Error al jugar. La ficha no fue consumida.', 'error');
      });
  }, [token.id, addToast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#D81B60');
    grad.addColorStop(0.3, '#F9A825');
    grad.addColorStop(0.5, '#FFD54F');
    grad.addColorStop(0.7, '#F9A825');
    grad.addColorStop(1, '#D81B60');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * h;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 20px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ RASPA AQUÍ ✨', w / 2, h / 2 - 14);
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Desliza para descubrir tu premio', w / 2, h / 2 + 16);
  }, []);

  const scratch = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas || won) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const cx = ((x - rect.left) / rect.width) * canvas.width;
      const cy = ((y - rect.top) / rect.height) * canvas.height;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let transparent = 0;
      for (let i = 3; i < imgData.data.length; i += 4) {
        if (imgData.data[i] === 0) transparent++;
      }
      const pct = transparent / (imgData.data.length / 4);
      setScratched(pct);

      if (pct > 0.45 && !won) {
        setWon(true);
        setCelebrating(true);
        const res = resultRef.current;
        if (res) {
          setTimeout(() => {
            onComplete(res.grams, res.balance, res.oz);
          }, 2000);
        }
      }
    },
    [won, onComplete],
  );

  const handleMouseDown = () => { isDrawingRef.current = true; };
  const handleMouseUp = () => { isDrawingRef.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingRef.current) scratch(e.clientX, e.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    scratch(t.clientX, t.clientY);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center font-body overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #1a1a0a 0%, #0a0a12 100%)' }}>
      <FloatingParticles count={15} />
      {celebrating && <Confetti />}

      <button onClick={onBack} disabled={won} className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50">
        <X size={24} />
      </button>

      <h2 className="font-heading font-bold text-2xl text-white mb-1 relative z-10" style={{ textShadow: '0 0 15px rgba(249,168,37,0.5)' }}>
        ✨ Raspadita Dorada
      </h2>
      <p className="text-white/50 text-sm mb-6 relative z-10">Raspa para descubrir tu premio</p>

      <div className="relative z-10" style={{ width: 300, height: 190 }}>
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1a0a2e, #2a1a40)',
            border: '2px solid rgba(249,168,37,0.3)',
            boxShadow: '0 0 30px rgba(249,168,37,0.15)',
          }}
        >
          <p className="text-4xl mb-1">💎</p>
          <p className="font-heading font-bold text-5xl" style={{ color: '#F9A825', animation: won ? 'popIn 0.5s ease-out forwards' : undefined, textShadow: '0 0 20px rgba(249,168,37,0.5)' }}>
            {prizeText || '???'}
          </p>
          <p className="text-white/40 text-sm mt-1">gramos ganados</p>
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={380}
          className="absolute inset-0 w-full h-full rounded-2xl cursor-crosshair touch-none"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          onTouchMove={handleTouchMove}
        />
      </div>

      <div className="relative z-10 mt-4 w-[300px]">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Progreso</span>
          <span style={{ color: '#F9A825' }}>{Math.round(scratched * 100)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, scratched * 100)}%`, background: 'linear-gradient(90deg, #D81B60, #F9A825)' }}
          />
        </div>
      </div>

      {won && (
        <p className="relative z-10 mt-4 font-heading font-bold text-xl" style={{ color: '#F9A825', animation: 'popIn 0.5s ease-out forwards', textShadow: '0 0 20px rgba(249,168,37,0.5)' }}>
          ¡Felicidades!
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DICE GAME (dados de la suerte)
// ═══════════════════════════════════════════════════════════════════════════════

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function DiceGame({ token, onComplete, onBack }: GameProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [rolling, setRolling] = useState(false);
  const [die1, setDie1] = useState(0);
  const [die2, setDie2] = useState(0);
  const [won, setWon] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [resultText, setResultText] = useState('');
  const animFrameRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const handleRoll = useCallback(() => {
    if (rolling || won) return;
    setRolling(true);
    setResultText('');

    let ticks = 0;
    animFrameRef.current = setInterval(() => {
      setDie1(Math.floor(Math.random() * 6));
      setDie2(Math.floor(Math.random() * 6));
      ticks++;
      if (ticks > 25) clearInterval(animFrameRef.current);
    }, 70);

    playGame(token.id, 'DICE')
      .then((res) => {
        const d = res.data;
        const grams = d.gramsWon ?? 0;

        setTimeout(() => {
          clearInterval(animFrameRef.current);
          const finalDie1 = Math.min(grams, 5);
          const finalDie2 = Math.max(0, Math.min(grams - 1, 5));
          setDie1(finalDie1);
          setDie2(finalDie2);
          setRolling(false);
          setWon(true);
          setCelebrating(true);
          setResultText(`¡Ganaste ${grams}g!`);

          setTimeout(() => {
            onComplete(grams, d.newGramBalance ?? d.newBalance ?? 0, d.ozCompleted ?? false);
          }, 2500);
        }, 2000);
      })
      .catch(() => {
        clearInterval(animFrameRef.current);
        setRolling(false);
        addToast('Error al jugar. La ficha no fue consumida.', 'error');
      });
  }, [rolling, won, token.id, onComplete, addToast]);

  useEffect(() => {
    return () => clearInterval(animFrameRef.current);
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center font-body overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #0a1a0a 0%, #0a0a12 100%)' }}>
      <FloatingParticles count={15} />
      {celebrating && <Confetti />}

      <button onClick={onBack} disabled={won || rolling} className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50">
        <X size={24} />
      </button>

      <h2 className="font-heading font-bold text-2xl text-white mb-1 relative z-10" style={{ textShadow: '0 0 15px rgba(118,255,3,0.5)' }}>
        🎲 Dados de la Suerte
      </h2>
      <p className="text-white/50 text-sm mb-8 relative z-10">Lanza los dados y gana gramos</p>

      <div className="flex gap-8 mb-8 relative z-10">
        {[die1, die2].map((face, i) => (
          <div
            key={i}
            className="w-28 h-28 rounded-2xl flex items-center justify-center text-7xl"
            style={{
              background: won
                ? 'linear-gradient(135deg, #D81B60, #F9A825)'
                : 'linear-gradient(135deg, #1a1a3e, #2a2a5e)',
              border: won ? '2px solid #F9A825' : '2px solid rgba(118,255,3,0.3)',
              boxShadow: won ? '0 0 25px rgba(249,168,37,0.5)' : '0 0 15px rgba(118,255,3,0.15)',
              animation: rolling ? 'diceShake 0.4s ease-in-out infinite' : undefined,
            }}
          >
            <span style={{ filter: won ? 'drop-shadow(0 0 10px rgba(249,168,37,0.8))' : undefined }}>
              {DICE_FACES[face]}
            </span>
          </div>
        ))}
      </div>

      {!won && (
        <button
          onClick={handleRoll}
          disabled={rolling}
          className="relative z-10 px-10 py-4 rounded-full font-heading font-bold text-lg text-white transition-all"
          style={rolling ? { background: '#333', cursor: 'not-allowed' } : {
            background: 'linear-gradient(90deg, #76FF03, #00E5FF)',
            animation: 'spinBtn 2s ease-in-out infinite',
            color: '#0a0a12',
          }}
        >
          {rolling ? '🎲 Lanzando...' : '🎲 ¡LANZAR!'}
        </button>
      )}

      {resultText && (
        <p className="relative z-10 mt-6 font-heading font-bold text-3xl" style={{ color: '#76FF03', animation: 'popIn 0.5s ease-out forwards', textShadow: '0 0 20px rgba(118,255,3,0.5)' }}>
          {resultText}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME SELECTOR — casino-style card grid with neon effects
// ═══════════════════════════════════════════════════════════════════════════════

type GameType = 'roulette' | 'puzzle' | 'memory' | 'scratch' | 'dice';

interface GameSelectorProps {
  onSelect: (game: GameType) => void;
  disabled?: boolean;
}

function GameSelector({ onSelect, disabled }: GameSelectorProps) {
  const games: { type: GameType; emoji: string; name: string; desc: string; range: string; gradient: string; glowColor: string; delay: string }[] = [
    {
      type: 'roulette',
      emoji: '🎰',
      name: 'Ruleta de la Suerte',
      desc: 'Gira la ruleta y gana',
      range: '1-3g',
      gradient: 'linear-gradient(135deg, #D81B60 0%, #880E4F 100%)',
      glowColor: 'rgba(216,27,96,0.4)',
      delay: '0s',
    },
    {
      type: 'scratch',
      emoji: '✨',
      name: 'Raspadita Dorada',
      desc: 'Raspa y descubre',
      range: '1-3g',
      gradient: 'linear-gradient(135deg, #F9A825 0%, #F57F17 100%)',
      glowColor: 'rgba(249,168,37,0.4)',
      delay: '0.1s',
    },
    {
      type: 'dice',
      emoji: '🎲',
      name: 'Dados de la Suerte',
      desc: 'Lanza y gana',
      range: '1-3g',
      gradient: 'linear-gradient(135deg, #76FF03 0%, #33691E 100%)',
      glowColor: 'rgba(118,255,3,0.4)',
      delay: '0.2s',
    },
    {
      type: 'puzzle',
      emoji: '🧩',
      name: 'Puzzle 15',
      desc: 'Ordena los números',
      range: '1-4g',
      gradient: 'linear-gradient(135deg, #00E5FF 0%, #006064 100%)',
      glowColor: 'rgba(0,229,255,0.4)',
      delay: '0.3s',
    },
    {
      type: 'memory',
      emoji: '🃏',
      name: 'Memoria Casino',
      desc: 'Encuentra los pares',
      range: '1-4g',
      gradient: 'linear-gradient(135deg, #E040FB 0%, #6A1B9A 100%)',
      glowColor: 'rgba(224,64,251,0.4)',
      delay: '0.4s',
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="font-heading font-bold text-lg text-white" style={{ textShadow: '0 0 10px rgba(249,168,37,0.3)' }}>
        🎮 Elige tu juego
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {games.map((g, i) => (
          <button
            key={g.type}
            onClick={() => !disabled && onSelect(g.type)}
            disabled={disabled}
            className={clsx(
              'relative rounded-2xl p-4 text-left transition-all overflow-hidden',
              i === 0 && 'col-span-2',
              disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'active:scale-[0.97] hover:brightness-110',
            )}
            style={{
              background: disabled ? '#1a1a2e' : g.gradient,
              boxShadow: disabled ? 'none' : `0 0 20px ${g.glowColor}`,
              animation: disabled ? undefined : `slideUp 0.5s ease-out ${g.delay} both`,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {!disabled && (
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'scratchShimmer 3s linear infinite',
                }}
              />
            )}

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className={clsx('text-3xl', i === 0 && 'text-4xl')}>{disabled ? '🔒' : g.emoji}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.8)' }}
                >
                  {g.range}
                </span>
              </div>
              <p className="font-heading font-bold text-sm text-white leading-tight">{g.name}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{g.desc}</p>
            </div>

            {disabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                <Lock size={24} className="text-white/40" />
              </div>
            )}
          </button>
        ))}
      </div>
      {disabled && (
        <p className="text-center text-xs text-white/40 font-body">
          Realiza una compra para desbloquear las fichas de juego
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — Casino lobby
// ═══════════════════════════════════════════════════════════════════════════════

type PageState = 'idle' | 'roulette' | 'puzzle' | 'memory' | 'scratch' | 'dice' | 'result';

export default function GamesPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

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

  const [pageState, setPageState] = useState<PageState>('idle');
  const [result, setResult] = useState<{ gramsWon: number; newBalance: number; ozCompleted: boolean } | null>(null);
  const gameSelectorRef = useRef<HTMLDivElement>(null);

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

  const handleBackFromGame = () => setPageState('idle');
  const handleResultClose = () => { setResult(null); setPageState('idle'); };

  if (pageState === 'roulette' && activeToken) {
    return (<><style>{CASINO_STYLES}</style><RouletteGame token={activeToken} onComplete={handleGameComplete} onBack={handleBackFromGame} /></>);
  }
  if (pageState === 'puzzle' && activeToken) {
    return (<><style>{CASINO_STYLES}</style><NumberPuzzleGame token={activeToken} onComplete={handleGameComplete} onBack={handleBackFromGame} /></>);
  }
  if (pageState === 'memory' && activeToken) {
    return (<><style>{CASINO_STYLES}</style><MemoryGame token={activeToken} onComplete={handleGameComplete} onBack={handleBackFromGame} /></>);
  }
  if (pageState === 'scratch' && activeToken) {
    return (<><style>{CASINO_STYLES}</style><ScratchCardGame token={activeToken} onComplete={handleGameComplete} onBack={handleBackFromGame} /></>);
  }
  if (pageState === 'dice' && activeToken) {
    return (<><style>{CASINO_STYLES}</style><DiceGame token={activeToken} onComplete={handleGameComplete} onBack={handleBackFromGame} /></>);
  }

  return (
    <div className="min-h-screen font-body pb-24" style={{ background: 'linear-gradient(180deg, #0d0d1a 0%, #1a0a2e 50%, #0d0d1a 100%)' }}>
      <style>{CASINO_STYLES}</style>
      <FloatingParticles count={25} />
      <AppBar title="🎰 Sala de Juegos" showBack />

      <main className="px-4 py-4 space-y-5 relative z-10">

        <div className="text-center py-6">
          {tokensLoading ? (
            <div className="w-16 h-16 rounded-full animate-pulse mx-auto" style={{ background: 'rgba(249,168,37,0.2)' }} />
          ) : pendingTokens.length > 0 ? (
            <>
              <Gem
                size={60}
                className="mx-auto"
                strokeWidth={1.5}
                style={{ color: '#F9A825', animation: 'coinPulse 2s ease-in-out infinite' }}
              />
              <p className="font-heading font-bold text-[64px] leading-none mt-3" style={{ color: '#F9A825', textShadow: '0 0 30px rgba(249,168,37,0.5)' }}>
                {pendingTokens.length}
              </p>
              <p className="font-body text-white/60 text-base mt-1">
                ficha{pendingTokens.length !== 1 ? 's' : ''} disponible{pendingTokens.length !== 1 ? 's' : ''}
              </p>
              <p className="font-body text-white/40 text-sm mt-1.5 max-w-65 mx-auto">
                ¡Juega y gana gramos de esencia!
              </p>
            </>
          ) : (
            <>
              <Gem size={56} className="mx-auto" style={{ color: 'rgba(255,255,255,0.2)' }} strokeWidth={1.5} />
              <p className="font-heading font-semibold text-lg text-white/70 mt-3">
                No tienes fichas
              </p>
              <p className="font-body text-white/40 text-sm mt-1.5">
                Cada compra te da una ficha de juego
              </p>
              <Link
                to="/catalogo"
                className="inline-block mt-4 font-body font-semibold px-6 py-2.5 rounded-full text-sm text-white"
                style={{ background: 'linear-gradient(90deg, #D81B60, #F9A825)', boxShadow: '0 0 15px rgba(216,27,96,0.4)' }}
              >
                Ver catálogo
              </Link>
            </>
          )}
        </div>

        {expiringTokens.length > 0 && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(249,168,37,0.1)', border: '1px solid rgba(249,168,37,0.3)', animation: 'cardGlow 3s ease-in-out infinite' }}
          >
            <Clock size={20} style={{ color: '#F9A825' }} className="flex-none mt-0.5" />
            <div className="flex-1">
              <p className="font-body text-sm font-medium" style={{ color: '#F9A825' }}>
                {expiringTokens.length} ficha{expiringTokens.length !== 1 ? 's' : ''} {expiringTokens.length !== 1 ? 'vencen' : 'vence'} en menos de 12h
              </p>
              <button onClick={scrollToGames} className="font-body text-sm font-bold mt-1 underline" style={{ color: '#F9A825' }}>
                ¡Juega ahora!
              </button>
            </div>
          </div>
        )}

        <div ref={gameSelectorRef}>
          <GameSelector onSelect={handleSelectGame} disabled={pendingTokens.length === 0} />
        </div>

        {challenge && (
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(249,168,37,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} style={{ color: '#F9A825' }} />
              <h3 className="font-heading font-semibold text-sm text-white">Reto Semanal</h3>
            </div>

            <p className="font-body text-sm text-white/80">{challenge.description}</p>

            {challenge.myProgress?.completed ? (
              <div className="mt-3 px-3 py-2 rounded-lg text-center" style={{ background: 'rgba(118,255,3,0.1)', border: '1px solid rgba(118,255,3,0.3)' }}>
                <span className="font-body font-bold text-sm" style={{ color: '#76FF03' }}>✅ Completado</span>
              </div>
            ) : (
              <>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-body text-white/50 mb-1">
                    <span>{challenge.myProgress?.purchasesCount ?? 0} de {challenge.requiredPurchases} compras</span>
                    <span style={{ color: '#F9A825' }}>Premio: {challenge.gramReward}g</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((challenge.myProgress?.purchasesCount ?? 0) / challenge.requiredPurchases) * 100)}%`,
                        background: 'linear-gradient(90deg, #D81B60, #F9A825)',
                        boxShadow: '0 0 8px rgba(249,168,37,0.4)',
                      }}
                    />
                  </div>
                </div>
                {challenge.weekEnd && (
                  <p className="text-[11px] text-white/30 font-body mt-2">
                    Termina en {Math.max(0, Math.ceil((new Date(challenge.weekEnd).getTime() - now) / (1000 * 60 * 60 * 24)))} días
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <Link
          to="/mis-gramos"
          className="flex items-center justify-between rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(249,168,37,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(249,168,37,0.15)' }}>
              <Gem size={18} style={{ color: '#F9A825' }} />
            </div>
            <div>
              <p className="font-body text-sm text-white/80 font-medium">
                Tu saldo: <span className="font-heading font-bold" style={{ color: '#F9A825' }}>{gramBalance}g</span> / 13g
              </p>
              <div className="h-1.5 w-32 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (gramBalance / 13) * 100)}%`, background: 'linear-gradient(90deg, #D81B60, #F9A825)' }}
                />
              </div>
            </div>
          </div>
          <ChevronRight size={18} className="text-white/30" />
        </Link>

      </main>

      {pageState === 'result' && result && (
        <ResultModal
          gramsWon={result.gramsWon}
          newBalance={result.newBalance}
          ozCompleted={result.ozCompleted}
          onClose={handleResultClose}
          onGoToGrams={() => { handleResultClose(); navigate('/mis-gramos'); }}
        />
      )}

      <BottomTabBar pendingGameTokens={pendingTokens.length} />
    </div>
  );
}
