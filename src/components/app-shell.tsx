"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Plus,
  Power,
  Settings,
  Sun,
  Users,
  Wallet,
  X,
  Clapperboard,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useSettings } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { buttonClass } from "./ui";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/posts", label: "Publications", icon: Clapperboard },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/analytics", label: "Statistiques", icon: BarChart3 },
  { href: "/revenue", label: "Revenus", icon: Wallet },
  { href: "/accounts", label: "Comptes", icon: Users },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("vp-theme", next ? "dark" : "light");
    } catch {
      /* stockage indisponible */
    }
  };
  return { dark, toggle };
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex size-9 items-center justify-center rounded-xl gradient-brand shadow-[0_4px_14px_-4px_var(--accent)]">
        <svg viewBox="0 0 24 24" className="size-4 text-white" fill="currentColor">
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">VideoPosting</span>
        <span className="block text-[11px] text-muted">Studio multi-plateforme</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-subtle group-hover:text-fg")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { data: settings } = useSettings();
  const { dark, toggle } = useTheme();
  const router = useRouter();
  const logout = async () => {
    await api("/api/session", { method: "DELETE" });
    router.replace("/login");
  };
  const [stopped, setStopped] = useState(false);
  const quit = async () => {
    if (!confirm("Quitter VideoPosting ? Les publications programmées ne partiront pas tant que l'application est fermée.")) return;
    await api("/api/desktop/quit", { method: "POST" }).catch(() => undefined);
    setStopped(true);
  };
  if (stopped) {
    return <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">VideoPosting est arrêté. Vous pouvez fermer cet onglet.</p>;
  }
  return (
    <div className="space-y-3">
      {settings?.demoMode && (
        <Link
          href="/settings"
          className="flex items-start gap-2.5 rounded-xl border border-dashed border-warning/40 bg-warning/8 p-3 text-xs transition-colors hover:bg-warning/12"
        >
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <span className="block font-semibold text-fg">Mode démo actif</span>
            <span className="text-muted">Publications et données simulées. Configurer les API →</span>
          </span>
        </Link>
      )}
      <div className="flex items-center gap-1">
        <button onClick={toggle} className={buttonClass("ghost", "sm", "flex-1 justify-start")} aria-label="Changer de thème">
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {dark ? "Thème clair" : "Thème sombre"}
        </button>
        {settings?.passwordProtected && (
          <button onClick={logout} className={buttonClass("ghost", "icon-sm")} aria-label="Se déconnecter" title="Se déconnecter">
            <LogOut className="size-4" />
          </button>
        )}
        {settings?.hosting === "desktop" && (
          <button onClick={quit} className={buttonClass("ghost", "icon-sm")} aria-label="Quitter VideoPosting" title="Quitter VideoPosting">
            <Power className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="flex min-h-dvh">
      {/* Barre latérale (bureau) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface/60 px-3 py-5 backdrop-blur lg:flex">
        <Logo />
        <Link href="/compose" className={buttonClass("primary", "md", "mx-1 mt-6 mb-5")}>
          <Plus className="size-4" /> Nouvelle publication
        </Link>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      {/* Barre supérieure (mobile) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-bg/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setMobileOpen(true)} className={buttonClass("ghost", "icon-sm")} aria-label="Menu">
            <MenuIcon className="size-5" />
          </button>
          <Logo />
          <Link href="/compose" className={buttonClass("primary", "icon-sm")} aria-label="Nouvelle publication">
            <Plus className="size-4" />
          </Link>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 animate-slide-up flex-col border-r border-border bg-surface px-3 py-5">
              <div className="flex items-center justify-between">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className={buttonClass("ghost", "icon-sm")} aria-label="Fermer">
                  <X className="size-4" />
                </button>
              </div>
              <Link href="/compose" className={buttonClass("primary", "md", "mx-1 mt-6 mb-5")}>
                <Plus className="size-4" /> Nouvelle publication
              </Link>
              <div className="flex-1 overflow-y-auto">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarFooter />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8", wide ? "max-w-[1500px]" : "max-w-7xl", className)}>{children}</div>;
}
