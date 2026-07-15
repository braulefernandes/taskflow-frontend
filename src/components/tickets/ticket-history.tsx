"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { describeHistoryEvent, translateHistoryAction } from "@/lib/ticket-history-formatters";
import { formatDateTime } from "@/lib/ticket-formatters";
import { listTicketHistory, ticketHistoryQueryKey } from "@/services/ticket-history";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function TicketHistory({ id }: { id: string }) {
  const validId = uuidPattern.test(id);
  const history = useQuery({ queryKey: ticketHistoryQueryKey(id), queryFn: ({ signal }) => listTicketHistory(id, signal), enabled: validId });

  return <section aria-labelledby="ticket-history-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div><h2 className="text-lg font-bold text-slate-950" id="ticket-history-title">Histórico</h2><p className="mt-1 text-sm text-slate-600">Acompanhe as alterações da solicitação em ordem cronológica.</p></div>
    <div className="mt-5">
      {history.isPending && validId ? <Skeleton label="Carregando histórico" lines={4} /> : null}
      {history.isError ? <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert"><p className="text-sm text-red-800">Não foi possível carregar o histórico.</p><Button className="mt-3" onClick={() => history.refetch()} type="button" variant="secondary">Tentar novamente</Button></div> : null}
      {history.data?.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">Nenhum evento registrado.</p> : null}
      {history.data?.length ? <ol aria-label="Linha do tempo da solicitação" className="relative ml-2 border-l border-slate-300 sm:ml-3">{history.data.map((event) => <li className="relative pb-6 pl-6 last:pb-0 sm:pl-8" key={event.id}><span aria-hidden="true" className="absolute -left-2 top-1.5 h-4 w-4 rounded-full border-4 border-white bg-indigo-600" /><article aria-label={translateHistoryAction(event.action)} className="min-w-0"><h3 className="break-words text-sm font-semibold text-slate-950">{describeHistoryEvent(event)}</h3><div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5"><span>por <strong className="font-medium text-slate-700">{event.author.name}</strong></span><span aria-hidden="true" className="hidden sm:inline">•</span><time dateTime={event.created_at}>{formatDateTime(event.created_at)}</time></div></article></li>)}</ol> : null}
    </div>
  </section>;
}
