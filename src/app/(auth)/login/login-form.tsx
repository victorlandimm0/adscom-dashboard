"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [message, action, pending] = useActionState(login, "");
  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={254}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-2 focus:outline-teal-700" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={4096}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-2 focus:outline-teal-700" />
      </div>
      <p role="status" aria-live="polite" className="text-sm text-red-700">{message}</p>
      <button type="submit" disabled={pending}
        className="w-full rounded-lg bg-teal-800 px-4 py-3 font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
