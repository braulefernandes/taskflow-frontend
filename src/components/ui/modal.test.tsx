import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/ui/modal";

describe("Modal", () => {
  afterEach(cleanup);
  it("exposes dialog semantics and closes from every supported control", () => { const close = vi.fn(); render(<Modal onClose={close} title="Editar categoria"><p>Conteudo</p></Modal>); expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true"); fireEvent.keyDown(document, { key: "Escape" }); fireEvent.click(screen.getByRole("button", { name: "Fechar" })); fireEvent.click(screen.getByRole("button", { name: "Fechar modal" })); expect(close).toHaveBeenCalledTimes(3); });
});
