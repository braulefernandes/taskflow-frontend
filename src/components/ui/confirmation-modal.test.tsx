import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

describe("ConfirmationModal", () => {
  it("confirma, cancela e expõe semântica acessível", async () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    render(<ConfirmationModal description="Esta ação não pode ser desfeita." onCancel={cancel} onConfirm={confirm} open title="Cancelar solicitação?" />);
    expect(screen.getByRole("alertdialog", { name: "Cancelar solicitação?" }).getAttribute("aria-modal")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" })));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(confirm).toHaveBeenCalledOnce();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("não renderiza quando fechado", () => {
    const { container } = render(<ConfirmationModal description="Descrição" onCancel={vi.fn()} onConfirm={vi.fn()} open={false} title="Título" />);
    expect(container.innerHTML).toBe("");
  });
});
