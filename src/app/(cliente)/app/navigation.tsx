"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app", label: "Visão geral" },
  { href: "/app/presenca", label: "Presença" },
  { href: "/app/avaliacoes", label: "Avaliações" },
  { href: "/app/nfc", label: "NFC" },
  { href: "/app/relatorios", label: "Relatórios" },
  { href: "/app/configuracoes", label: "Configurações" },
];

export function DashboardNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="p-4">
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} prefetch={false} aria-current={pathname === href ? "page" : undefined}
              className={`block rounded-lg px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-teal-700 ${pathname === href ? "bg-teal-50 text-teal-900" : "text-slate-600 hover:bg-slate-100"}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
