"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/providers/session-provider";

type PrivateShellProps = {
  children: ReactNode;
};

export function PrivateShell({ children }: PrivateShellProps) {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-950">TaskFlow</p>
            {session ? (
              <p className="text-sm text-slate-600">
                {session.organization.name} · {session.membership.role}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {session ? (
              <div className="text-sm text-slate-700 sm:text-right">
                <p className="font-medium text-slate-950">{session.user.name}</p>
                <p>{session.user.email}</p>
              </div>
            ) : null}
            <Button
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
              variant="secondary"
            >
              {isSigningOut ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
