import { TicketsPage } from "@/components/tickets/tickets-page";

type TicketsRouteProps = { searchParams: Promise<{ page?: string | string[] }> };

export default async function TicketsRoute({ searchParams }: TicketsRouteProps) {
  const value = (await searchParams).page;
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  const initialPage = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  return <TicketsPage initialPage={initialPage} />;
}
