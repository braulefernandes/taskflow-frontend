"use client";

import { useEffect, useRef } from "react";

type ConfirmationModalProps = { open: boolean; title: string; description: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void };

export function ConfirmationModal({ open, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar", destructive = false, busy = false, onConfirm, onCancel }: ConfirmationModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape" && !busy) onCancel(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="Fechar confirmação" className="absolute inset-0 bg-slate-950/60" disabled={busy} onClick={onCancel} type="button" /><section aria-describedby="confirmation-description" aria-labelledby="confirmation-title" aria-modal="true" className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-2xl sm:p-6" role="alertdialog"><h2 className="text-lg font-bold" id="confirmation-title">{title}</h2><p className="mt-2 text-sm text-slate-600" id="confirmation-description">{description}</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-50" disabled={busy} onClick={onCancel} ref={cancelRef} type="button">{cancelLabel}</button><button className={`min-h-10 rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${destructive ? "bg-red-700 hover:bg-red-800 focus-visible:outline-red-700" : "bg-slate-950 hover:bg-slate-800 focus-visible:outline-slate-950"}`} disabled={busy} onClick={onConfirm} type="button">{busy ? "Aguarde..." : confirmLabel}</button></div></section></div>;
}
