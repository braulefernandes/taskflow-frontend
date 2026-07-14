import { z } from "zod";

const required = "Campo obrigatorio.";
const passwordMessage = "A senha deve ter entre 8 e 128 caracteres e conter letras e numeros.";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, required).email("Informe um e-mail valido.").max(320),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(1, required).min(8, passwordMessage).max(128, passwordMessage).regex(/[A-Za-z]/, passwordMessage).regex(/\d/, passwordMessage),
  passwordConfirmation: z.string().min(1, required),
}).refine((values) => values.newPassword === values.passwordConfirmation, { path: ["passwordConfirmation"], message: "As senhas informadas nao coincidem." });

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
