"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/providers/session-provider";

type PrivateShellProps = { children: ReactNode };

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: HomeIcon, management: true },
  { label: "SolicitaÃ§Ãµes", href: "/solicitacoes", icon: TicketIcon },
  { label: "Usuários", href: "/usuarios", icon: UsersIcon, admin: true },
  { label: "Categorias", href: "/categorias", icon: TagIcon, admin: true },
  { label: "Perfil", href: "/perfil", icon: UserIcon },
] as const;

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/solicitacoes": "SolicitaÃ§Ãµes",
  "/usuarios": "Usuários",
  "/categorias": "Categorias",
  "/perfil": "Perfil",
};

const roleLabels = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  AGENT: "Agente",
  REQUESTER: "Solicitante",
} as const;

export function PrivateShell({ children }: PrivateShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isAdmin = session?.membership.role === "ADMIN";
  const isManagement = isAdmin || session?.membership.role === "MANAGER";
  const visibleNavigation = navigation.filter(
    (item) => (!("admin" in item) || isAdmin) && (!("management" in item) || isManagement),
  );
  const pageTitle = routeLabels[pathname] ?? "TaskFlow";

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
        setIsUserOpen(false);
      }
    }
    function closeUserMenu(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) setIsUserOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeUserMenu);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeUserMenu);
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    router.replace("/login");
  }

  const navigationContent = (
    <>
      <Link className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400" href="/dashboard" onClick={() => setIsMobileOpen(false)}>
        <BrandMark />
        <span className="text-xl font-bold tracking-tight text-white">TaskFlow</span>
      </Link>
      <div className="mt-8 border-t border-slate-700 pt-5">
        <p className="truncate text-sm font-semibold text-white">{session?.organization.name}</p>
        <p className="mt-1 text-xs text-slate-400">{session ? roleLabels[session.membership.role] : null}</p>
      </div>
      <nav aria-label="Navegação principal" className="mt-8 flex-1">
        <ul className="space-y-1">
          {visibleNavigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`} href={item.href} onClick={() => setIsMobileOpen(false)}>
                  <Icon />{item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="hidden min-h-screen flex-col bg-slate-950 px-5 py-6 lg:flex">{navigationContent}</aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/60 focus-visible:outline-2 focus-visible:outline-white" onClick={() => setIsMobileOpen(false)} type="button" />
          <aside aria-label="Menu mobile" id="mobile-navigation" className="relative flex h-full w-72 flex-col bg-slate-950 px-5 py-6 shadow-2xl">{navigationContent}</aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button aria-controls="mobile-navigation" aria-expanded={isMobileOpen} aria-label="Abrir menu" className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 lg:hidden" onClick={() => setIsMobileOpen(true)} type="button"><MenuIcon /></button>
            <div className="lg:hidden"><BrandMark compact /></div>
            <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 sm:block">
              <ol className="flex items-center gap-2 text-sm"><li className="text-slate-500">TaskFlow</li><li aria-hidden="true" className="text-slate-300">/</li><li aria-current="page" className="truncate font-medium text-slate-900">{pageTitle}</li></ol>
            </nav>
            <div className="ml-auto relative" ref={userMenuRef}>
              <button aria-expanded={isUserOpen} aria-haspopup="menu" className="flex items-center gap-3 rounded-lg p-1.5 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" onClick={() => setIsUserOpen((open) => !open)} type="button">
                <Avatar name={session?.user.name ?? "Usuário"} />
                <span className="hidden max-w-44 sm:block"><span className="block truncate text-sm font-semibold text-slate-900">{session?.user.name}</span><span className="block truncate text-xs text-slate-500">{session?.user.email}</span></span>
                <ChevronIcon />
              </button>
              {isUserOpen ? (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl" role="menu">
                  <div className="border-b border-slate-100 px-3 py-2 sm:hidden"><p className="truncate text-sm font-semibold">{session?.user.name}</p><p className="truncate text-xs text-slate-500">{session?.user.email}</p></div>
                  <Link className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600" href="/perfil" onClick={() => setIsUserOpen(false)} role="menuitem">Meu perfil</Link>
                  <button className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50" disabled={isSigningOut} onClick={handleSignOut} role="menuitem" type="button">{isSigningOut ? "Saindo..." : "Sair"}</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span aria-hidden="true" className={`inline-flex ${compact ? "size-8" : "size-9"} items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm`}>T</span>;
}
function Avatar({ name }: { name: string }) { const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase(); return <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials}</span>; }
function Icon({ children }: { children: ReactNode }) { return <svg aria-hidden="true" className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">{children}</svg>; }
function HomeIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Icon>; }
function TicketIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" d="M9 8h6M9 12h6M9 16h3" /></Icon>; }
function UsersIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Icon>; }
function TagIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M20.6 13.6 11 23l-10-10V3h10l9.6 9.6a.7.7 0 0 1 0 1ZM6.5 8A1.5 1.5 0 1 0 6.5 5a1.5 1.5 0 0 0 0 3Z" /></Icon>; }
function UserIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></Icon>; }
function MenuIcon() { return <Icon><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /></Icon>; }
function ChevronIcon() { return <svg aria-hidden="true" className="size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" /></svg>; }
