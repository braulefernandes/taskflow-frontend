export function Skeleton({ lines = 3, label = "Carregando conteúdo" }: { lines?: number; label?: string }) {
  return <div aria-label={label} aria-live="polite" className="animate-pulse space-y-3 rounded-xl border border-slate-200 bg-white p-5" role="status">{Array.from({ length: lines }, (_, index) => <div aria-hidden="true" className={`h-4 rounded bg-slate-200 ${index === lines - 1 ? "w-2/3" : "w-full"}`} key={index} />)}<span className="sr-only">{label}</span></div>;
}

export function TicketCardSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Skeleton label="Carregando solicitação" lines={5} /><Skeleton label="Carregando solicitação" lines={5} /><Skeleton label="Carregando solicitação" lines={5} /></div>;
}
