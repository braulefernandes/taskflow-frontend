"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    function escape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="Fechar modal" className="absolute inset-0 bg-slate-950/60" onClick={onClose} type="button" /><section aria-labelledby="modal-title" aria-modal="true" className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-6" role="dialog"><div className="flex items-start justify-between gap-4"><h2 className="text-xl font-bold" id="modal-title">{title}</h2><button aria-label="Fechar" className="min-h-10 rounded-md px-3 text-slate-600 hover:bg-slate-100" onClick={onClose} type="button">×</button></div>{children}</section></div>;
}
