import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Campo obrigatório.").max(255, "Informe no máximo 255 caracteres."),
  avatar_url: z.string().trim().max(2048, "Informe no máximo 2048 caracteres.").refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Informe uma URL HTTP ou HTTPS válida."),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
