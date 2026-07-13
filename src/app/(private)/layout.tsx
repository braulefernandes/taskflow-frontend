import type { ReactNode } from "react";
import { PrivateRouteGuard } from "@/components/auth/private-route-guard";
import { PrivateShell } from "@/components/auth/private-shell";

type PrivateLayoutProps = {
  children: ReactNode;
};

export default function PrivateLayout({ children }: PrivateLayoutProps) {
  return (
    <PrivateRouteGuard>
      <PrivateShell>{children}</PrivateShell>
    </PrivateRouteGuard>
  );
}
