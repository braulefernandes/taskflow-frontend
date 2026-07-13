import type { ReactNode } from "react";
import { PublicRouteGuard } from "@/components/auth/public-route-guard";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <PublicRouteGuard>
      <main className="min-h-screen bg-slate-50">{children}</main>
    </PublicRouteGuard>
  );
}
