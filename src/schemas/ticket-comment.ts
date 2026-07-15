import { z } from "zod";
export const ticketCommentMaxLength = 5000;
export const ticketCommentSchema = z.object({ content: z.string().trim().min(1, "Escreva um comentário antes de enviar.").max(ticketCommentMaxLength, `O comentário deve ter no máximo ${ticketCommentMaxLength} caracteres.`) });
export type TicketCommentFormValues = z.infer<typeof ticketCommentSchema>;
