/**
 * AdminTable — Reusable data table with sticky header, loading skeletons,
 * empty state, sort indicators, and pagination.
 */

import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "../../utils/cn";
import type { ReactNode } from "react";
import { AdminSkeleton } from "./AdminSkeleton";
import "../../css/AdminTable.css";

export interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  className?: string;
}

interface SortState {
  key: string;
  dir: "asc" | "desc";
}

interface AdminTableProps<T> {
  columns: Column[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  sort?: SortState;
  onSort?: (key: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  children: (item: T) => ReactNode;
  emptyState?: ReactNode;
  showHeader?: boolean;
}

export default function AdminTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  skeletonRows = 5,
  sort,
  onSort,
  page,
  totalPages = 1,
  onPageChange,
  totalItems,
  pageSize,
  children,
  emptyState,
  showHeader = true,
}: AdminTableProps<T>) {
  const cols = columns.length;

  function SortIcon({ colKey }: { colKey: string }) {
    if (!sort || sort.key !== colKey || !onSort) return null;
    return sort.dir === "asc" ? (
      <ArrowUp size={12} className="admin-table__sort-icon" />
    ) : (
      <ArrowDown size={12} className="admin-table__sort-icon" />
    );
  }

  return (
    <div className="admin-table">
      <div className="admin-table__scroll">
        <table className="admin-table__table" role="table">
          {showHeader && (
            <thead className="admin-table__thead">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "admin-table__th",
                      col.hideOnMobile && "admin-table__th--hide-mobile",
                      col.sortable && onSort && "admin-table__th--sortable",
                      col.className,
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                    scope="col"
                  >
                    {col.header}
                    {col.sortable && !sort?.key ? (
                      <ArrowUpDown size={11} className="admin-table__sort-icon" />
                    ) : (
                      <SortIcon colKey={col.key} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody className="admin-table__tbody">
            {loading ? (
              <AdminSkeleton.Rows count={skeletonRows} cols={cols} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={cols} className="admin-table__empty">
                  {emptyState || "Sin datos"}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={keyExtractor(item)}>
                  {children(item)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && onPageChange && page && totalPages > 1 && (
        <div className="admin-table__pagination">
          <p className="admin-table__pagination-info">
            {totalItems != null && pageSize != null
              ? `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} de ${totalItems}`
              : `Página ${page} de ${totalPages}`}
          </p>
          <div className="admin-table__pagination-nav">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="admin-table__pagination-btn"
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="admin-table__pagination-current">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="admin-table__pagination-btn"
              aria-label="Página siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
