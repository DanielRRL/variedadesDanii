/**
 * AuthLayout — Split-screen layout for all auth pages.
 *
 * Left panel:  Fuchsia background with lava-lamp blob animation, branding,
 *              headline, description, and optional feature cards.
 * Right panel: White background with the actual form content (children).
 *
 * On mobile (< lg):  The left panel renders as a compact top banner.
 * On desktop (≥ lg):  Classic 42/58 horizontal split, left panel sticky.
 */

import type { ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FeatureCard {
  icon: ReactNode;
  title: string;
  description: string;
}

interface AuthLayoutProps {
  /** Headline on the fuchsia panel */
  headline: string;
  /** Subtext below headline */
  description: string;
  /** Optional feature cards at the bottom of the fuchsia panel */
  features?: FeatureCard[];
  /** Background variant — defaults to 'pink' */
  variant?: 'pink' | 'green';
  /** The form content */
  children: ReactNode;
}

// ── SVG Goo filter (creates metaball merging effect) ─────────────────────────

function LavaGooFilter() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <filter id="lava-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AuthLayout({
  headline,
  description,
  features = [],
  variant = 'pink',
  children,
}: AuthLayoutProps) {
  const isPink = variant === 'pink';

  const panelBg = isPink
    ? 'bg-[#D81B60]'
    : 'bg-[#2E7D32]';

  const vignetteStyle = isPink
    ? { background: 'radial-gradient(ellipse at center, transparent 40%, rgba(180, 10, 70, 0.3) 100%)' }
    : { background: 'radial-gradient(ellipse at center, transparent 40%, rgba(20, 80, 30, 0.3) 100%)' };

  const overlayClass = isPink
    ? 'bg-[#D81B60]/20'
    : 'bg-[#2E7D32]/20';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-body">

      {/* SVG filter definition (rendered once, hidden) */}
      <LavaGooFilter />

      {/* ── Left panel — branding + lava lamp ─────────────────────────────── */}
      <div
        className={`relative overflow-hidden ${panelBg} text-white
          flex flex-col
          px-6 py-6 sm:py-8 lg:px-10 lg:py-12
          lg:w-[42%] lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden
          min-h-50 sm:min-h-65`}
      >
        {/* Lava lamp blobs — pink variant */}
        {isPink && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none lava-container" aria-hidden="true">
            <div className="lava-blob lava-blob-1" />
            <div className="lava-blob lava-blob-2" />
            <div className="lava-blob lava-blob-3" />
            <div className="lava-blob lava-blob-4" />
            <div className="lava-blob lava-blob-5" />
            <div className="lava-blob lava-blob-6" />
            <div className="lava-blob lava-blob-7" />
            <div className="lava-blob lava-blob-8" />
            <div className="lava-blob lava-blob-9" />
            <div className="lava-blob lava-blob-10" />
          </div>
        )}

        {/* Lava lamp blobs — green variant */}
        {!isPink && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none lava-container" aria-hidden="true">
            <div className="lava-blob lava-blob-green-1" />
            <div className="lava-blob lava-blob-green-2" />
            <div className="lava-blob lava-blob-green-3" />
            <div className="lava-blob lava-blob-green-4" />
            <div className="lava-blob lava-blob-green-5" />
            <div className="lava-blob lava-blob-green-6" />
            <div className="lava-blob lava-blob-green-7" />
          </div>
        )}

        {/* Overlay to unify blobs with background */}
        <div className={`absolute inset-0 ${overlayClass} pointer-events-none z-5`} />

        {/* Vignette on edges */}
        <div
          className="absolute inset-0 pointer-events-none z-6"
          style={vignetteStyle}
        />

        {/* Content (z-10 to sit above blobs + overlays) */}
        <div className="relative z-10 flex flex-col h-full justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/25 border border-white/30 backdrop-blur-sm flex items-center justify-center font-heading font-bold text-sm sm:text-lg text-gray-800">
              VR
            </div>
            <div>
              <p className="font-heading font-bold text-sm sm:text-base leading-tight">Variedades Danii</p>
              <p className="text-white/70 text-xs">Perfumería · Armenia, Quindío</p>
            </div>
          </div>

          {/* Headline + description */}
          <div className="mt-auto mb-auto py-4 sm:py-6 lg:py-0 lg:mt-0 lg:mb-0 flex flex-col items-start justify-center lg:justify-end lg:flex-1">
            <h2 className="font-heading text-xl sm:text-2xl lg:text-[28px] font-bold leading-[1.2] max-w-[320px]">
              {headline}
            </h2>
            <p className="text-white/80 text-sm mt-3 max-w-[320px] leading-relaxed hidden sm:block">
              {description}
            </p>
          </div>

          {/* Feature cards */}
          {features.length > 0 && (
            <div className="hidden sm:flex flex-col gap-3 mt-4 lg:mt-6">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/10 border border-white/15 backdrop-blur-sm rounded-xl px-4 py-3"
                >
                  <div className="flex-none w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{f.title}</p>
                    {f.description && (
                      <p className="text-white/70 text-xs">{f.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — form content ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-8 sm:px-8 lg:px-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
