"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { ErrorMessage } from "@/components/ui/error-message";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/use-app-form";
import { isApiError } from "@/lib/api-error";
import { translateTicketPriority } from "@/lib/ticket-formatters";
import { ticketEditSchema, type TicketEditFormValues } from "@/schemas/ticket";
import { categoriesQueryKey, listActiveCategories } from "@/services/categories";
import { getTicket, ticketsQueryKey, updateTicket } from "@/services/tickets";
import { ticketPriorities, type TicketSummary, type TicketUpdateRequest } from "@/types/tickets";
import { useSession } from "@/providers/session-provider";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function canEditTicket(ticket: TicketSummary, role: string, userId: string) {
  if (ticket.status === "CANCELLED") return false;
  if (role === "ADMIN" || role === "MANAGER") return true;
  return role === "REQUESTER" && ticket.requester.id === userId && ticket.status === "PENDING" && !ticket.assignee;
}

function updateError(error: unknown) {
  if (isApiError(error)) {
    if (error.code === "category_inactive") return "A categoria selecionada não está mais ativa.";
    if (error.code === "resource_not_found") return "A solicitação ou categoria não foi encontrada.";
    if (error.code === "due_date_in_past") return "O prazo precisa estar no futuro.";
    if (error.code === "terminal_ticket_planning_update") return "Prioridade e prazo não podem ser alterados neste estado.";
    if (error.code === "cancelled_ticket_edit") return "Solicitações canceladas não podem ser editadas.";
    if (error.status === 403 || error.code === "insufficient_role") return "Você não possui permissão para editar está solicitação.";
    if (error.status === 422 || error.code === "validation_error") return "Confira os campos e tente novamente.";
  }
  if (error instanceof TypeError) return "Não foi possível conectar ao servidor.";
  return "Não foi possível atualizar a solicitação. Tente novamente.";
}

export function EditTicketForm({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [minimumDueDate] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<string>();
  const validId = uuidPattern.test(id);
  const detail = useQuery({ queryKey: [...ticketsQueryKey, "detail", id], queryFn: ({ signal }) => getTicket(id, signal), enabled: validId });
  const categories = useQuery({ queryKey: [...categoriesQueryKey, "active"], queryFn: ({ signal }) => listActiveCategories(signal), enabled: validId });
  const form = useAppForm<TicketEditFormValues>(ticketEditSchema, { defaultValues: { title: "", description: "", category_id: "", priority: "MEDIUM", due_date: "" }, shouldFocusError: true });
  const { register, handleSubmit, reset, setError, formState: { errors, dirtyFields, isDirty } } = form;

  useEffect(() => {
    if (!detail.data) return;
    reset({ title: detail.data.title, description: detail.data.description, category_id: detail.data.category.id, priority: detail.data.priority, due_date: toLocalInput(detail.data.due_date) });
  }, [detail.data, reset]);

  const mutation = useMutation({
    mutationFn: (payload: TicketUpdateRequest) => updateTicket(id, payload),
    onSuccess: async (ticket) => {
      setFeedback("Solicitação atualizada com sucesso.");
      queryClient.setQueryData([...ticketsQueryKey, "detail", id], ticket);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketsQueryKey, refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: [...ticketsQueryKey, "detail", id], refetchType: "none" }),
      ]);
      router.push(`/solicitacoes/${id}`);
    },
    onError: (error) => {
      if (isApiError(error) && error.code === "category_inactive") setError("category_id", { type: "server", message: updateError(error) });
      if (isApiError(error) && error.code === "due_date_in_past") setError("due_date", { type: "server", message: updateError(error) });
    },
  });

  const options = useMemo(() => {
    const active = categories.data?.map((category) => ({ label: category.name, value: category.id })) ?? [];
    if (detail.data && !active.some((option) => option.value === detail.data?.category.id)) active.push({ label: `${detail.data.category.name} (inativa - atual)`, value: detail.data.category.id });
    return active;
  }, [categories.data, detail.data]);

  if (!validId) return <ErrorState message="Confira o endereço informado." title="Identificador de solicitação inválido" />;
  if (detail.isPending || categories.isPending) return <Skeleton label="Carregando formulário de edição" lines={6} />;
  if (detail.isError || categories.isError) return <ErrorState action={<Button onClick={() => { detail.refetch(); categories.refetch(); }} type="button">Tentar novamente</Button>} message="Não foi possível carregar os dados necessários para edição." />;
  const ticket = detail.data;
  const role = session?.membership.role ?? "REQUESTER";
  const allowed = canEditTicket(ticket, role, session?.user.id ?? "");
  if (!allowed) return <ErrorState action={<Button asChild variant="secondary"><Link href={`/solicitacoes/${id}`}>Voltar aos detalhes</Link></Button>} message={ticket.status === "CANCELLED" ? "Solicitações canceladas não podem ser editadas." : "Seu papel ou o estado atual não permite edição."} title="Edição indisponível" />;
  const planningAllowed = (role === "ADMIN" || role === "MANAGER") && ticket.status !== "COMPLETED";

  function cancel() {
    if (!isDirty || window.confirm("Descartar as alterações desta solicitação?")) router.push(`/solicitacoes/${id}`);
  }

  function submit(values: TicketEditFormValues) {
    if (mutation.isPending || !isDirty) return;
    if (dirtyFields.due_date && values.due_date && new Date(values.due_date).getTime() <= minimumDueDate) {
      setError("due_date", { type: "validate", message: "Informe um prazo futuro." });
      return;
    }
    const payload: TicketUpdateRequest = {};
    if (dirtyFields.title) payload.title = values.title;
    if (dirtyFields.description) payload.description = values.description;
    if (dirtyFields.category_id) payload.category_id = values.category_id;
    if (planningAllowed && dirtyFields.priority) payload.priority = values.priority;
    if (planningAllowed && dirtyFields.due_date) payload.due_date = values.due_date ? new Date(values.due_date).toISOString() : null;
    if (Object.keys(payload).length) mutation.mutate(payload);
  }

  return <section aria-labelledby="edit-ticket-title" className="mx-auto max-w-3xl space-y-6"><header><Link className="text-sm font-medium text-indigo-700 hover:underline" href={`/solicitacoes/${id}`}>← Voltar aos detalhes</Link><h1 className="mt-3 text-2xl font-bold" id="edit-ticket-title">Editar solicitação</h1><p className="mt-1 text-sm text-slate-600">Altere somente as informações necessárias.</p></header>{feedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800" role="status">{feedback}</div> : null}<form className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" noValidate onSubmit={handleSubmit(submit)}><ErrorMessage message={mutation.error ? updateError(mutation.error) : undefined} /><FormField error={errors.title?.message} id="ticket-title" label="Título"><Input disabled={mutation.isPending} id="ticket-title" {...register("title")} /></FormField><FormField error={errors.description?.message} id="ticket-description" label="Descrição"><Textarea disabled={mutation.isPending} id="ticket-description" {...register("description")} /></FormField><FormField error={errors.category_id?.message} id="ticket-category" label="Categoria"><Select disabled={mutation.isPending} id="ticket-category" options={options} {...register("category_id")} /></FormField>{planningAllowed ? <div className="grid gap-5 sm:grid-cols-2"><FormField error={errors.priority?.message} id="ticket-priority" label="Prioridade"><Select disabled={mutation.isPending} id="ticket-priority" options={ticketPriorities.map((priority) => ({ label: translateTicketPriority(priority), value: priority }))} {...register("priority")} /></FormField><DateField disabled={mutation.isPending} error={errors.due_date?.message} id="ticket-due-date" label="Prazo (opcional)" {...register("due_date")} /></div> : null}<div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><Button disabled={mutation.isPending} onClick={cancel} type="button" variant="secondary">Cancelar</Button><Button disabled={mutation.isPending || !isDirty} type="submit">{mutation.isPending ? <><Loading label="Salvando" /> <span className="sr-only">alterações</span></> : "Salvar alterações"}</Button></div></form></section>;
}
