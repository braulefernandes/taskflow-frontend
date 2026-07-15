import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDueDate, formatOverdue, getDisplayTimeZone, translateTicketPriority, translateTicketStatus } from "@/lib/ticket-formatters";

describe("ticket formatters", () => {
  it("traduz todos os status", () => {
    expect(["PENDING", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"].map((value) => translateTicketStatus(value as Parameters<typeof translateTicketStatus>[0]))).toEqual(["Pendente", "Em andamento", "Aguardando retorno", "Concluída", "Cancelada"]);
  });

  it("traduz todas as prioridades", () => {
    expect(["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => translateTicketPriority(value as Parameters<typeof translateTicketPriority>[0]))).toEqual(["Baixa", "Média", "Alta", "Urgente"]);
  });

  it("formata data e hora sem alterar a fonte UTC", () => {
    const source = "2026-07-15T12:30:00.000Z";
    const original = new Date(source).toISOString();
    expect(formatDate(source)).toMatch(/15\/07\/2026/);
    expect(formatDateTime(source)).toContain("15/07/2026");
    expect(new Date(source).toISOString()).toBe(original);
    expect(getDisplayTimeZone()).toBeTruthy();
  });

  it("formata prazo, ausência e atraso", () => {
    const now = new Date("2026-07-15T13:00:00.000Z");
    expect(formatDueDate(null, now)).toBe("Sem prazo");
    expect(formatDueDate("2026-07-15T12:00:00.000Z", now)).toContain("Venceu em");
    expect(formatOverdue(90000)).toBe("1d 1h em atraso");
  });

  it("lida com datas inválidas", () => {
    expect(formatDate("invalida")).toBe("Data inválida");
    expect(formatDueDate("invalida")).toBe("Prazo inválido");
  });
});
