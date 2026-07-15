import { z } from "zod";
import { ticketPriorities } from "@/types/tickets";

export const ticketCreateSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(255, "Use até 255 caracteres."),
  description: z.string().trim().min(1, "Informe a descrição.").max(10000, "Use até 10000 caracteres."),
  category_id: z.string().min(1, "Selecione uma categoria."),
  priority: z.enum(ticketPriorities, { error: "Selecione uma prioridade válida." }),
  due_date: z.string().refine((value) => !value || (!Number.isNaN(new Date(value).getTime()) && new Date(value).getTime() > Date.now()), "Informe um prazo futuro."),
});

export type TicketCreateFormValues = z.infer<typeof ticketCreateSchema>;

export const ticketEditSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(255, "Use até 255 caracteres."),
  description: z.string().trim().min(1, "Informe a descrição.").max(10000, "Use até 10000 caracteres."),
  category_id: z.string().min(1, "Selecione uma categoria."),
  priority: z.enum(ticketPriorities, { error: "Selecione uma prioridade válida." }),
  due_date: z.string(),
});

export type TicketEditFormValues = z.infer<typeof ticketEditSchema>;
