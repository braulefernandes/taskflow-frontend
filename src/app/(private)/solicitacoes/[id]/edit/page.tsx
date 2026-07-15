import { EditTicketForm } from "@/components/tickets/edit-ticket-form";

export default async function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditTicketForm id={id} />;
}
