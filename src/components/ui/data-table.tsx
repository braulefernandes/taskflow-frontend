import type { ReactNode } from "react";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
};

type DataTableProps<Row> = {
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  rows: readonly Row[];
  minimumWidth?: string;
};

export function DataTable<Row>({ caption, columns, getRowKey, rows, minimumWidth = "640px" }: DataTableProps<Row>) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm" style={{ minWidth: minimumWidth }}><caption className="sr-only">{caption}</caption><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr>{columns.map((column) => <th className={["px-4 py-3 font-semibold", column.className].filter(Boolean).join(" ")} key={column.key} scope="col">{column.header}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{rows.map((row) => <tr className="hover:bg-slate-50" key={getRowKey(row)}>{columns.map((column) => <td className={["px-4 py-3", column.className].filter(Boolean).join(" ")} key={column.key}>{column.cell(row)}</td>)}</tr>)}</tbody></table></div></div>;
}
