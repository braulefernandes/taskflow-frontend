"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/use-app-form";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/ticket-formatters";
import { useSession } from "@/providers/session-provider";
import { ticketCommentMaxLength, ticketCommentSchema, type TicketCommentFormValues } from "@/schemas/ticket-comment";
import { createTicketComment, listTicketComments, ticketCommentsQueryKey } from "@/services/ticket-comments";
import { getTicket, ticketsQueryKey } from "@/services/tickets";
import type { AuthMembership } from "@/types/auth";
import type { TicketComment } from "@/types/ticket-comments";
import type { TicketSummary } from "@/types/tickets";

export function canCommentOnTicket(ticket: TicketSummary, role: AuthMembership["role"], userId: string) {
  if (ticket.status === "CANCELLED") return false;
  if (role === "ADMIN" || role === "MANAGER") return true;
  if (role === "AGENT") return ticket.requester.id === userId || ticket.assignee?.id === userId;
  return ticket.requester.id === userId;
}
function commentError(error: unknown) {
  if (isApiError(error) && error.code === "cancelled_ticket_comment") return "Esta solicitação foi cancelada e não aceita comentários.";
  if (isApiError(error) && error.status === 422) return "Confira o comentário e tente novamente.";
  if (isApiError(error) && (error.status === 403 || error.status === 404)) return "Você não tem permissão para comentar nesta solicitação.";
  if (error instanceof TypeError) return "Não foi possível conectar ao servidor.";
  return "Não foi possível enviar o comentário. Tente novamente.";
}
function CommentAvatar({ comment }: { comment: TicketComment }) {
  // User-provided avatar hosts are not constrained by the current API contract.
  // eslint-disable-next-line @next/next/no-img-element
  if (comment.author.avatar_url) return <img alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" src={comment.author.avatar_url} />;
  return <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800">{comment.author.name.trim().charAt(0).toUpperCase() || "?"}</span>;
}
export function TicketComments({ ticket }: { ticket: TicketSummary }) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canComment = canCommentOnTicket(ticket, session?.membership.role ?? "REQUESTER", session?.user.id ?? "");
  const queryKey = ticketCommentsQueryKey(ticket.id);
  const comments = useQuery({ queryKey, queryFn: ({ signal }) => listTicketComments(ticket.id, signal) });
  const { register, handleSubmit, reset, watch, formState: { errors } } = useAppForm(ticketCommentSchema, { defaultValues: { content: "" }, shouldFocusError: true });
  const contentField = register("content");
  const mutation = useMutation({ mutationFn: (values: TicketCommentFormValues) => createTicketComment(ticket.id, values), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey }); reset(); textareaRef.current?.focus(); } });
  useEffect(() => { if (mutation.error && isApiError(mutation.error) && mutation.error.code === "cancelled_ticket_comment") void queryClient.invalidateQueries({ queryKey: ["tickets", "detail", ticket.id] }); }, [mutation.error, queryClient, ticket.id]);
  function submit(values: TicketCommentFormValues) { if (!mutation.isPending) mutation.mutate(values); }
  const count = watch("content")?.length ?? 0;
  return <section aria-labelledby="ticket-comments-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-bold text-slate-950" id="ticket-comments-title">Comentários</h2>{comments.data ? <span className="text-sm text-slate-500">{comments.data.length} {comments.data.length === 1 ? "comentário" : "comentários"}</span> : null}</div>
    <div className="mt-4">{comments.isPending ? <Skeleton label="Carregando comentários" lines={3} /> : null}{comments.isError ? <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert"><p className="text-sm text-red-800">Não foi possível carregar os comentários.</p><Button className="mt-3" onClick={() => comments.refetch()} type="button" variant="secondary">Tentar novamente</Button></div> : null}{comments.data?.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">Nenhum comentário ainda. Seja o primeiro a participar.</p> : null}{comments.data?.length ? <ol aria-label="Comentários em ordem cronológica" className="divide-y divide-slate-200">{comments.data.map((comment) => <li className="flex gap-3 py-4 first:pt-0 last:pb-0" key={comment.id}><CommentAvatar comment={comment} /><div className="min-w-0 flex-1"><div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"><p className="break-words text-sm font-semibold text-slate-950">{comment.author.name}</p><time className="shrink-0 text-xs text-slate-500" dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{comment.content}</p></div></li>)}</ol> : null}</div>
    {canComment ? <form className="mt-6 border-t border-slate-200 pt-5" noValidate onSubmit={handleSubmit(submit)}><ErrorMessage message={mutation.error ? commentError(mutation.error) : undefined} /><FormField error={errors.content?.message} hint="Evite incluir senhas ou outros dados sensíveis." id="ticket-comment" label="Novo comentário"><Textarea aria-describedby="ticket-comment-count" disabled={mutation.isPending} id="ticket-comment" maxLength={ticketCommentMaxLength} {...contentField} ref={(element) => { contentField.ref(element); textareaRef.current = element; }} /></FormField><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span aria-live="polite" className="text-xs text-slate-500" id="ticket-comment-count">{count}/{ticketCommentMaxLength} caracteres</span><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Enviando..." : "Enviar comentário"}</Button></div></form> : <p className="mt-6 rounded-lg bg-slate-100 p-4 text-sm text-slate-700" role="status">{ticket.status === "CANCELLED" ? "Solicitações canceladas não aceitam novos comentários." : "Você não tem permissão para comentar nesta solicitação."}</p>}
  </section>;
}

export function TicketCommentsContainer({ id }: { id: string }) {
  const ticket = useQuery({ queryKey: [...ticketsQueryKey, "detail", id], queryFn: ({ signal }) => getTicket(id, signal) });
  if (!ticket.data) return null;
  return <TicketComments ticket={ticket.data} />;
}
