import { TicketDetails } from "@/components/tickets/ticket-details";
import { TicketCommentsContainer } from "@/components/tickets/ticket-comments";
import { TicketHistory } from "@/components/tickets/ticket-history";

export default async function TicketDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="space-y-6"><TicketDetails id={id} /><TicketCommentsContainer id={id} /><TicketHistory id={id} /></div>;
}
