import type { ReactNode } from "react";

export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return <section className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center" aria-labelledby="empty-state-title"><div aria-hidden="true" className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">{icon ?? "◇"}</div><h2 className="font-semibold text-slate-950" id="empty-state-title">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</section>;
}
