"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/ui/loading";
import { useSession } from "@/providers/session-provider";

type PrivateRouteGuardProps = {
  children: React.ReactNode;
};

export function PrivateRouteGuard({ children }: PrivateRouteGuardProps) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <Loading label="Validando sessão" />
      </main>
    );
  }

  return children;
}
