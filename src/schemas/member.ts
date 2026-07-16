import { z } from "zod";

const passwordMessage = "A senha deve ter entre 8 e 128 caracteres e conter letras e números.";
export const memberSchema = z.object({
  name: z.string().trim().min(1, "Campo obrigatório.").max(255),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(320),
  role: z.enum(["ADMIN", "MANAGER", "AGENT", "REQUESTER"]),
  temporary_password: z.string().min(8, passwordMessage).max(128, passwordMessage).regex(/[A-Za-z]/, passwordMessage).regex(/\d/, passwordMessage),
});
export type MemberFormValues = z.infer<typeof memberSchema>;
