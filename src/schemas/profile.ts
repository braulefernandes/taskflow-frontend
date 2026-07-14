import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Campo obrigatorio.").max(255, "Informe no maximo 255 caracteres."),
  avatar_url: z.string().trim().max(2048, "Informe no maximo 2048 caracteres.").refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Informe uma URL HTTP ou HTTPS valida."),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
