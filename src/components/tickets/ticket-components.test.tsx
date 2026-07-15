import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketAssignee } from "@/components/tickets/ticket-assignee";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/tickets/ticket-badges";
import { TicketCard } from "@/components/tickets/ticket-card";

describe("ticket components", () => {
  it("renderiza badges com texto e símbolo, sem depender apenas de cor", () => {
    render(<><TicketStatusBadge status="IN_PROGRESS" /><TicketPriorityBadge priority="URGENT" /></>);
    expect(screen.getByText("Em andamento")).toBeTruthy();
    expect(screen.getByText("Urgente")).toBeTruthy();
    expect(screen.getAllByText(/[●◆]/)).toHaveLength(2);
  });

  it("renderiza responsável e estado sem atribuição", () => {
    const { rerender } = render(<TicketAssignee assignee={null} />);
    expect(screen.getByText("Sem responsável")).toBeTruthy();
    rerender(<TicketAssignee assignee={{ id: "1", name: "Ana Souza", email: "ana@example.com" }} />);
    expect(screen.getByText("AS")).toBeTruthy();
    expect(screen.getByText("ana@example.com")).toBeTruthy();
  });

  it("renderiza o card mobile com dados essenciais e indicação textual de atraso", () => {
    render(<TicketCard ticket={{ id: "1", title: "Acesso ao financeiro", description: "Liberar perfil", status: "PENDING", priority: "HIGH", category: "Acessos", requester: "Bruno Lima", due_date: "2026-07-14T12:00:00Z", is_overdue: true }} />);
    const card = screen.getByTestId("ticket-card");
    expect(card.className).toContain("min-w-0");
    expect(card.className).toContain("flex-col");
    expect(screen.getByText("Acesso ao financeiro")).toBeTruthy();
    expect(screen.getByText(/Atrasada/)).toBeTruthy();
  });
});
