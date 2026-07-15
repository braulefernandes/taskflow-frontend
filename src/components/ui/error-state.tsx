import type { ReactNode } from "react";

export function ErrorState({ title = "Não foi possível carregar", message, action }: { title?: string; message: string; action?: ReactNode }) {
  return <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900" role="alert"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm">{message}</p>{action ? <div className="mt-4">{action}</div> : null}</section>;
}
