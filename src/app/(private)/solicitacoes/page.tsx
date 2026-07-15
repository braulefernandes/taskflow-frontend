import { TicketsPage } from "@/components/tickets/tickets-page";
import { parseTicketFilters, type RawSearchParams } from "@/lib/ticket-list-filters";

type TicketsRouteProps = { searchParams: Promise<RawSearchParams> };

export default async function TicketsRoute({ searchParams }: TicketsRouteProps) {
  return <TicketsPage initialFilters={parseTicketFilters(await searchParams)} />;
}
