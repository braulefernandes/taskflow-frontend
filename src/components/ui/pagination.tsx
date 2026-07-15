"use client";

type PaginationProps = { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; label?: string };

export function Pagination({ page, pageSize, total, onPageChange, label = "Paginação" }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  if (total === 0) return null;
  return <nav aria-label={label} className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p aria-live="polite" className="text-slate-600">Página <strong>{safePage}</strong> de <strong>{totalPages}</strong> · {total} itens</p><div className="flex gap-2"><button className="min-h-10 rounded-md border border-slate-300 px-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50" disabled={safePage === 1} onClick={() => onPageChange(safePage - 1)} type="button">Anterior</button><button className="min-h-10 rounded-md border border-slate-300 px-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50" disabled={safePage === totalPages} onClick={() => onPageChange(safePage + 1)} type="button">Próxima</button></div></nav>;
}
