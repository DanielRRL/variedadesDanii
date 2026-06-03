/**
 * AdminSkeleton — Loading skeleton primitives for dashboards and tables.
 */

import "../../css/AdminSkeleton.css";

interface SkeletonProps {
  className?: string;
}

function Pulse({ className = "" }: SkeletonProps) {
  return <div className={`admin-skeleton-pulse ${className}`} aria-hidden="true" />;
}

function Card() {
  return (
    <div className="admin-skeleton-card">
      <div className="admin-skeleton-card__header">
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
    <div className="admin-skeleton-chart">
      <div className="admin-skeleton-chart__header">
        <Pulse className="h-4 w-36" />
        <Pulse className="h-7 w-28 rounded-lg" />
      </div>
      <Pulse className="h-52 w-full rounded-xl" />
    </div>
  );
}

function Row({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="admin-skeleton-row">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
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
