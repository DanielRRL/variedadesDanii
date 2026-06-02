/**
 * AdminSkeleton — Loading skeleton primitives for dashboards and tables.
 *
 * Exports:
 *   AdminSkeleton.Card    — Placeholder card (mimics AdminKpiCard shape)
 *   AdminSkeleton.Chart   — Placeholder chart area
 *   AdminSkeleton.Row     — Placeholder table row
 *   AdminSkeleton.Rows    — Multiple placeholder table rows
 *   AdminSkeleton.Block   — Generic text block
 */

interface SkeletonProps {
  className?: string;
}

function Pulse({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

function Card() {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Pulse className="h-3 w-20" />
        <Pulse className="h-8 w-8 rounded-xl" />
      </div>
      <Pulse className="h-7 w-28" />
      <Pulse className="h-3 w-32" />
    </div>
  );
}

function Chart() {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <Pulse className="h-4 w-36" />
        <Pulse className="h-7 w-28 rounded-lg" />
      </div>
      <Pulse className="h-52 w-full rounded-xl" />
    </div>
  );
}

function Row({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Pulse className="h-3.5 w-full max-w-[80%]" />
        </td>
      ))}
    </tr>
  );
}

function Rows({ count = 5, cols = 6 }: { count?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Row key={i} cols={cols} />
      ))}
    </>
  );
}

function Block({ className = "" }: SkeletonProps) {
  return <Pulse className={`h-4 ${className}`} />;
}

export const AdminSkeleton = { Card, Chart, Row, Rows, Block };
