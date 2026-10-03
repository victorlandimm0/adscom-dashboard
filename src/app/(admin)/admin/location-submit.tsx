"use client";

import { useFormStatus } from "react-dom";

export function LocationSubmit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}
      className="rounded-lg bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60">
      {pending ? "Salvando…" : children}
    </button>
  );
}
