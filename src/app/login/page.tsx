import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
      <footer className="relative flex justify-center gap-5 px-4 pb-6 text-xs text-muted">
        <Link href="/conditions" className="hover:text-fg">
          Conditions d&apos;utilisation
        </Link>
        <Link href="/confidentialite" className="hover:text-fg">
          Politique de confidentialité
        </Link>
      </footer>
    </div>
  );
}
