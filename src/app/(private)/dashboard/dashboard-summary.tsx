"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/providers/session-provider";
import { dashboardSummaryQueryKey, getDashboardSummary } from "@/services/dashboard";
import type { DashboardSummary as Summary } from "@/types/dashboard";

export function formatAverageResolution(hours: number | null | undefined) { if (hours === null || hours === undefined) return "Sem dados"; return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(hours)} h`; }
function SummaryCard({ label, value, description, emphasis = false }: { label: string; value: string | number; description: string; emphasis?: boolean }) { return <article aria-label={label} className={`min-w-0 rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${emphasis ? "border-red-200" : "border-slate-200"}`}><p className="text-sm font-medium text-slate-600">{label}</p><p className={`mt-2 break-words text-3xl font-bold tracking-tight ${emphasis ? "text-red-700" : "text-slate-950"}`}>{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{description}</p></article>; }
function DashboardSkeletons() { return <div aria-label="Resumo do dashboard carregando" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} label="Carregando indicador" lines={3} />)}</div>; }
function cards(data: Summary) { return [
  { label: "Total de solicitações", value: data.total ?? 0, description: "Todos os status, inclusive canceladas." },
  { label: "Pendentes", value: data.pending ?? 0, description: "Solicitações aguardando início." },
  { label: "Em andamento", value: data.in_progress ?? 0, description: "Solicitações em atendimento." },
  { label: "Concluídas", value: data.completed ?? 0, description: "Solicitações finalizadas." },
  { label: "Atrasadas", value: data.overdue ?? 0, description: "Não concluídas nem canceladas fora do prazo.", emphasis: true },
  { label: "Tempo médio de resolução", value: formatAverageResolution(data.average_resolution_hours), description: "Média em horas calculada pelo backend." },
]; }
export function DashboardSummary() {
  const router = useRouter(); const { session } = useSession(); const role = session?.membership.role; const allowed = role === "ADMIN" || role === "MANAGER";
  const summary = useQuery({ queryKey: dashboardSummaryQueryKey, queryFn: ({ signal }) => getDashboardSummary(signal), enabled: allowed });
  useEffect(() => { if (role && !allowed) router.replace("/solicitacoes"); }, [allowed, role, router]);
  if (!allowed) return <Loading label="Redirecionando para solicitações" />;
  if (summary.isPending) return <DashboardSkeletons />;
  if (summary.isError) return <ErrorState action={<Button onClick={() => summary.refetch()} type="button">Tentar novamente</Button>} message="Verifique sua conexão e tente novamente." title="Não foi possível carregar o resumo" />;
  if ((summary.data.total ?? 0) === 0) return <EmptyState description="Crie solicitações para começar a acompanhar os indicadores da organização." title="Ainda não há solicitações para resumir" />;
  return <div className="space-y-5"><div aria-label="Indicadores do dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards(summary.data).map((card) => <SummaryCard {...card} key={card.label} />)}</div><section aria-labelledby="secondary-status-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-sm font-semibold text-slate-950" id="secondary-status-title">Outros status</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-slate-600">Aguardando retorno</dt><dd className="mt-1 text-xl font-bold text-slate-950">{summary.data.waiting ?? 0}</dd></div><div><dt className="text-sm text-slate-600">Canceladas</dt><dd className="mt-1 text-xl font-bold text-slate-950">{summary.data.cancelled ?? 0}</dd></div></dl></section></div>;
}
