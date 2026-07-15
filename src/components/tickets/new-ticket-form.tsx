"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { ErrorMessage } from "@/components/ui/error-message";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/use-app-form";
import { isApiError } from "@/lib/api-error";
import { translateTicketPriority } from "@/lib/ticket-formatters";
import { ticketCreateSchema, type TicketCreateFormValues } from "@/schemas/ticket";
import { categoriesQueryKey, listActiveCategories } from "@/services/categories";
import { createTicket, ticketsQueryKey } from "@/services/tickets";
import { ticketPriorities, type TicketCreateRequest } from "@/types/tickets";

const defaults: TicketCreateFormValues = { title: "", description: "", category_id: "", priority: "MEDIUM", due_date: "" };

function requestError(error: unknown) {
  if (isApiError(error)) {
    if (error.code === "category_inactive") return "A categoria selecionada não está mais ativa.";
    if (error.code === "resource_not_found") return "A categoria selecionada não foi encontrada.";
    if (error.code === "due_date_in_past") return "O prazo precisa estar no futuro.";
    if (error.status === 422 || error.code === "validation_error") return "Confira os campos e tente novamente.";
  }
  if (error instanceof TypeError) return "Não foi possível conectar ao servidor.";
  return "Não foi possível criar a solicitação. Tente novamente.";
}

export function NewTicketForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string>();
  const categories = useQuery({ queryKey: [...categoriesQueryKey, "active"], queryFn: ({ signal }) => listActiveCategories(signal) });
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useAppForm(ticketCreateSchema, { defaultValues: defaults, shouldFocusError: true });
  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: async (ticket) => {
      setFeedback("Solicitação criada com sucesso. Redirecionando para os detalhes.");
      await queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
      router.push(`/solicitacoes/${ticket.id}`);
    },
    onError: (error) => {
      if (isApiError(error) && ["category_inactive", "resource_not_found"].includes(error.code ?? "")) setError("category_id", { type: "server", message: requestError(error) });
      if (isApiError(error) && error.code === "due_date_in_past") setError("due_date", { type: "server", message: requestError(error) });
    },
  });

  function cancel() {
    if (!isDirty || window.confirm("Descartar as alterações desta solicitação?")) router.push("/solicitacoes");
  }

  function submit(values: TicketCreateFormValues) {
    if (mutation.isPending) return;
    const payload: TicketCreateRequest = {
      title: values.title,
      description: values.description,
      category_id: values.category_id,
      priority: values.priority,
      due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
    };
    mutation.mutate(payload);
  }

  return <section aria-labelledby="new-ticket-title" className="mx-auto max-w-3xl space-y-6"><header><h1 className="text-2xl font-bold text-slate-950" id="new-ticket-title">Nova solicitação</h1><p className="mt-1 text-sm text-slate-600">Descreva sua necessidade para iniciar o atendimento.</p></header>{feedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800" role="status">{feedback}</div> : null}{categories.isPending ? <div className="rounded-xl border border-slate-200 bg-white p-8"><Loading label="Carregando categorias" /></div> : null}{categories.isError ? <ErrorState action={<Button onClick={() => categories.refetch()} type="button">Tentar novamente</Button>} message="Não foi possível carregar as categorias ativas." /> : null}{categories.data?.length === 0 ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-6" role="status"><h2 className="font-semibold text-amber-950">Nenhuma categoria disponível</h2><p className="mt-1 text-sm text-amber-900">Peça a um administrador para ativar uma categoria antes de criar a solicitação.</p></section> : null}{categories.data?.length ? <form className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" noValidate onSubmit={handleSubmit(submit)}><ErrorMessage message={mutation.error ? requestError(mutation.error) : undefined} /><FormField error={errors.title?.message} id="ticket-title" label="Título"><Input autoFocus disabled={mutation.isPending} id="ticket-title" maxLength={255} {...register("title")} /></FormField><FormField error={errors.description?.message} hint="Explique o contexto e o resultado esperado." id="ticket-description" label="Descrição"><Textarea disabled={mutation.isPending} id="ticket-description" maxLength={10000} {...register("description")} /></FormField><div className="grid gap-5 sm:grid-cols-2"><FormField error={errors.category_id?.message} id="ticket-category" label="Categoria"><Select disabled={mutation.isPending} id="ticket-category" options={categories.data.map((category) => ({ label: category.name, value: category.id }))} placeholder="Selecione uma categoria" {...register("category_id")} /></FormField><FormField error={errors.priority?.message} id="ticket-priority" label="Prioridade"><Select disabled={mutation.isPending} id="ticket-priority" options={ticketPriorities.map((priority) => ({ label: translateTicketPriority(priority), value: priority }))} {...register("priority")} /></FormField></div><DateField disabled={mutation.isPending} error={errors.due_date?.message} id="ticket-due-date" label="Prazo (opcional)" {...register("due_date")} /><div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><Button disabled={mutation.isPending} onClick={cancel} type="button" variant="secondary">Cancelar</Button><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Criando..." : "Criar solicitação"}</Button></div></form> : null}</section>;
}
