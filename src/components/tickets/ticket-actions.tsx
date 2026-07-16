"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { DateField } from "@/components/ui/date-field";
import { ErrorMessage } from "@/components/ui/error-message";
import { Select } from "@/components/ui/select";
import { isApiError } from "@/lib/api-error";
import { translateTicketPriority, translateTicketStatus } from "@/lib/ticket-formatters";
import { listMembers, membersQueryKey } from "@/services/members";
import { cancelTicket, ticketsQueryKey, updateTicket, updateTicketAssignee, updateTicketStatus } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { Member } from "@/types/members";
import { ticketPriorities, type TicketStatus, type TicketSummary } from "@/types/tickets";

const transitions: Record<TicketStatus, TicketStatus[]> = {
  PENDING: ["IN_PROGRESS", "WAITING"], IN_PROGRESS: ["WAITING", "COMPLETED"],
  WAITING: ["IN_PROGRESS", "COMPLETED"], COMPLETED: ["IN_PROGRESS"], CANCELLED: [],
};

export function validTicketTransitions(ticket: TicketSummary, role: AuthMembership["role"], userId: string) {
  const permitted = role === "ADMIN" || role === "MANAGER" || (role === "AGENT" && ticket.assignee?.id === userId);
  if (!permitted) return [];
  return transitions[ticket.status].filter((status) => status === "PENDING" || Boolean(ticket.assignee));
}

function actionError(error: unknown) {
  if (isApiError(error)) {
    if (error.code === "assignee_required_for_status") return "A solicitação precisa de responsável para essa transição.";
    if (error.code === "invalid_status_transition") return "Essa transição de status não é mais válida.";
    if (error.code === "due_date_in_past") return "O prazo precisa estar no futuro.";
    if (error.code?.includes("inactive")) return "O responsável selecionado não está ativo.";
    if (error.code === "assignee_role_not_allowed") return "O papel selecionado não pode ser responsável.";
    if (error.status === 403) return "Você não possui permissão para realizar está ação.";
    if (error.status === 409) return "O estado atual da solicitação não permite está ação.";
  }
  return "Não foi possível concluir a ação. Tente novamente.";
}

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function TicketActions({ ticket, role, userId }: { ticket: TicketSummary; role: AuthMembership["role"]; userId: string }) {
  const client = useQueryClient();
  const administrative = role === "ADMIN" || role === "MANAGER";
  const terminal = ticket.status === "COMPLETED" || ticket.status === "CANCELLED";
  const [feedback, setFeedback] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [priority, setPriority] = useState(ticket.priority);
  const [dueDate, setDueDate] = useState(() => localDate(ticket.due_date));
  const [minimumDueDate] = useState(() => Date.now());
  const [dueError, setDueError] = useState<string>();
  const members = useQuery({ queryKey: [...membersQueryKey, "eligible-assignees"], queryFn: ({ signal }) => listMembers({ is_active: true, page: 1, page_size: 100 }, signal), enabled: administrative && !terminal });
  const eligible = (members.data?.items ?? []).filter((member: Member) => member.is_active && member.role !== "REQUESTER");

  async function refresh(updated: TicketSummary, message: string) {
    client.setQueryData([...ticketsQueryKey, "detail", ticket.id], updated);
    await client.invalidateQueries({ queryKey: ticketsQueryKey, refetchType: "none" });
    setFeedback(message);
  }

  const assignee = useMutation({ mutationFn: (id: string | null) => updateTicketAssignee(ticket.id, id), onSuccess: (data, id) => refresh(data, id ? "Responsável atualizado com sucesso." : "Responsável removido com sucesso.") });
  const status = useMutation({ mutationFn: (value: TicketStatus) => updateTicketStatus(ticket.id, value), onSuccess: (data) => refresh(data, "Status atualizado com sucesso.") });
  const planning = useMutation({ mutationFn: (payload: { priority?: typeof priority; due_date?: string | null }) => updateTicket(ticket.id, payload), onSuccess: (data) => refresh(data, "Planejamento atualizado com sucesso.") });
  const cancellation = useMutation({ mutationFn: () => cancelTicket(ticket.id), onSuccess: (data) => { setConfirmCancel(false); return refresh(data, "Solicitação cancelada. O registro foi preservado."); } });
  const busy = assignee.isPending || status.isPending || planning.isPending || cancellation.isPending;
  const error = assignee.error ?? status.error ?? planning.error ?? cancellation.error;
  const nextStatuses = validTicketTransitions(ticket, role, userId);
  const canCancel = (administrative && !terminal) || (role === "REQUESTER" && ticket.requester.id === userId && ticket.status === "PENDING");

  function saveDueDate() {
    setDueError(undefined);
    if (dueDate && new Date(dueDate).getTime() <= minimumDueDate) { setDueError("Informe um prazo futuro."); return; }
    planning.mutate({ due_date: dueDate ? new Date(dueDate).toISOString() : null });
  }

  return <div className="space-y-5">
    {feedback ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">{feedback}</p> : null}
    <ErrorMessage message={error ? actionError(error) : undefined} />
    {administrative && !terminal ? <section className="space-y-2" aria-labelledby="assignment-title"><h3 className="font-semibold" id="assignment-title">Responsável</h3>{members.isPending ? <p role="status">Carregando responsáveis...</p> : members.isError ? <p role="alert">Não foi possível carregar os responsáveis.</p> : <><Select aria-label="Responsável elegível" disabled={busy} onChange={(event) => assignee.mutate(event.target.value || null)} options={[{ label: "Sem responsável", value: "" }, ...eligible.map((member) => ({ label: `${member.name} — ${member.email} — ${member.role} — Ativo`, value: member.user_id }))]} value={ticket.assignee?.id ?? ""} /><p className="text-xs text-slate-500">A seleção permite atribuir, trocar ou remover.</p></>}</section> : null}
    {nextStatuses.length ? <section className="space-y-2" aria-labelledby="status-title"><h3 className="font-semibold" id="status-title">Alterar status</h3><div className="flex flex-wrap gap-2">{nextStatuses.map((next) => <Button disabled={busy} key={next} onClick={() => status.mutate(next)} type="button" variant="secondary">{ticket.status === "COMPLETED" && next === "IN_PROGRESS" ? "Reabrir" : translateTicketStatus(next)}</Button>)}</div></section> : null}
    {administrative && !terminal ? <section className="space-y-3" aria-labelledby="planning-title"><h3 className="font-semibold" id="planning-title">Prioridade e prazo</h3><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Prioridade<Select disabled={busy} onChange={(event) => setPriority(event.target.value as typeof priority)} options={ticketPriorities.map((item) => ({ label: translateTicketPriority(item), value: item }))} value={priority} /></label><DateField disabled={busy} error={dueError} id="quick-due-date" label="Prazo" onChange={(event) => setDueDate(event.target.value)} value={dueDate} /></div><div className="flex flex-wrap gap-2"><Button disabled={busy || priority === ticket.priority} onClick={() => planning.mutate({ priority })} type="button" variant="secondary">Salvar prioridade</Button><Button disabled={busy || dueDate === localDate(ticket.due_date)} onClick={saveDueDate} type="button" variant="secondary">Salvar prazo</Button>{ticket.due_date ? <Button disabled={busy} onClick={() => planning.mutate({ due_date: null })} type="button" variant="secondary">Remover prazo</Button> : null}</div></section> : null}
    {canCancel ? <Button className="border border-red-700 bg-red-700 hover:bg-red-800 focus-visible:outline-red-700" disabled={busy} onClick={() => setConfirmCancel(true)} type="button">Cancelar solicitação</Button> : null}
    <ConfirmationModal busy={cancellation.isPending} confirmLabel="Cancelar solicitação" description="A solicitação será cancelada, mas continuará registrada. Esta ação não exclui dados." destructive onCancel={() => setConfirmCancel(false)} onConfirm={() => cancellation.mutate()} open={confirmCancel} title="Confirmar cancelamento" />
  </div>;
}
