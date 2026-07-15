import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DateField } from "@/components/ui/date-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton, TicketCardSkeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

describe("reusable ticket UI", () => {
  it("pagina usando botões acessíveis e respeita limites", () => {
    const change = vi.fn();
    render(<Pagination onPageChange={change} page={2} pageSize={10} total={25} />);
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(change).toHaveBeenNthCalledWith(1, 1);
    expect(change).toHaveBeenNthCalledWith(2, 3);
    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeTruthy();
  });

  it("não mostra paginação para lista vazia", () => {
    const { container } = render(<Pagination onPageChange={vi.fn()} page={1} pageSize={10} total={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("renderiza tabela tipada com caption", () => {
    type Row = { id: string; name: string };
    const columns: DataTableColumn<Row>[] = [{ key: "name", header: "Nome", cell: (row) => row.name }];
    render(<DataTable caption="Solicitações" columns={columns} getRowKey={(row) => row.id} rows={[{ id: "1", name: "Ticket um" }]} />);
    expect(screen.getByRole("table", { name: "Solicitações" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Nome" })).toBeTruthy();
  });

  it("renderiza estado vazio, erro e loading semânticos", () => {
    render(<><EmptyState description="Crie a primeira" title="Nenhuma solicitação" /><ErrorState message="Tente novamente" /><Skeleton /><TicketCardSkeleton /></>);
    expect(screen.getByRole("heading", { name: "Nenhuma solicitação" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Tente novamente");
    expect(screen.getAllByRole("status").length).toBeGreaterThan(1);
  });

  it("oferece campos nativos navegáveis e rotulados", () => {
    render(<><label htmlFor="status">Status</label><Select id="status" options={[{ label: "Pendente", value: "PENDING" }]} /><label htmlFor="description">Descrição</label><Textarea id="description" /><DateField id="due" label="Prazo" /></>);
    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("PENDING");
    expect(screen.getByLabelText("Descrição").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Prazo").getAttribute("type")).toBe("datetime-local");
  });
});
