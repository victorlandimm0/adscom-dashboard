// Chamado pela suíte RLS local: reutiliza fixtures e a limpeza em finally.
// Sem dependências de navegador. Exercita HTML SSR e formulários reais de Server Actions.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { testAdmin } from "./test-admin-http.mjs";

const origin = "http://127.0.0.1:3106";
const cookieName = "adscom_organization";
const routes = ["/app", "/app/presenca", "/app/avaliacoes", "/app/nfc", "/app/relatorios", "/app/configuracoes"];
const titles = ["Visão geral", "Presença", "Avaliações", "NFC", "Relatórios", "Configurações"];
const decode = (value) => value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");

function formFields(html, marker) {
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].find((match) => match[1].includes(marker));
  assert.ok(form, `Formulário não encontrado: ${marker}`);
  const fields = new FormData();
  for (const input of form[1].matchAll(/<input\b[^>]*>/g)) {
    const name = input[0].match(/\bname="([^"]*)"/)?.[1];
    const value = input[0].match(/\bvalue="([^"]*)"/)?.[1] ?? "";
    if (name) fields.set(decode(name), decode(value));
  }
  return fields;
}

function session() {
  const jar = new Map();
  return {
    jar,
    async request(path, body) {
      const response = await fetch(`${origin}${path}`, {
        method: body ? "POST" : "GET", body, redirect: "manual",
        headers: { Origin: origin, Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") },
        signal: AbortSignal.timeout(20000),
      });
      for (const header of response.headers.getSetCookie()) {
        const pair = header.split(";")[0];
        const split = pair.indexOf("=");
        const name = pair.slice(0, split);
        if (/max-age=0(?:;|$)/i.test(header)) jar.delete(name);
        else jar.set(name, pair.slice(split + 1));
      }
      return { response, html: await response.text() };
    },
  };
}

function current(html) {
  const value = html.match(/<p\b[^>]*data-testid="current-organization"[^>]*>([\s\S]*?)<\/p>/)?.[1];
  assert.ok(value, "Empresa atual ausente no HTML");
  return decode(value);
}

async function login(user) {
  const browser = session();
  const loginPage = await browser.request("/login");
  const form = formFields(loginPage.html, 'name="email"');
  form.set("email", user.email);
  form.set("password", user.password);
  const { response } = await browser.request("/login", form);
  assert.equal(response.status, 303, "Login deve redirecionar");
  assert.equal(new URL(response.headers.get("location"), origin).pathname, "/app");
  return browser;
}

export async function testDashboard({ users, orgA, orgB, key, sql }) {
  assert.ok(key.startsWith("sb_publishable_"), "Dashboard exige Publishable Key local");
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key };
  // O build também recebe ambiente LOCAL; não sobrescreve .env.local do desenvolvedor.
  const build = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "ignore", windowsHide: true });
  assert.equal((await once(build, "exit"))[0], 0, "Build local de teste falhou");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3106"], { env, stdio: "ignore", windowsHide: true });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      assert.equal(server.exitCode, null, "Servidor não iniciou; verifique porta 3106");
      try { ready = (await fetch(`${origin}/login`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* aguarda inicialização */ }
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, "Servidor local indisponível");
    const anonymous = session();
    for (const route of routes) {
      const { response } = await anonymous.request(route);
      assert.equal(response.status, 307);
      assert.equal(new URL(response.headers.get("location"), origin).pathname, "/login");
    }
    console.log("PASS shell: seis rotas redirecionam anônimo para login");

    const admin = await login(users.admin);
    let adminPage = await admin.request("/app");
    assert.equal(current(adminPage.html), "Nenhuma empresa selecionada");
    const selectionForm = formFields(adminPage.html, 'name="organization_id"');
    const choose = async (browser, organizationId) => {
      const form = new FormData();
      for (const [name, value] of selectionForm) form.set(name, value);
      form.set("organization_id", organizationId);
      return browser.request("/app", form);
    };
    const expectedNames = {};
    for (const [profile, ownId, otherId] of [["a", orgA, orgB], ["b", orgB, orgA]]) {
      const browser = await login(users[profile]);
      const initial = await browser.request("/app");
      const name = current(initial.html);
      assert.ok(name.endsWith(profile === "a" ? " A" : " B"));
      expectedNames[ownId] = name;
      assert.ok(!initial.html.includes('name="organization_id"'), "Empresa única não precisa de seletor");
      browser.jar.set(cookieName, encodeURIComponent(`${users[profile].id}:${otherId}`));
      const tampered = await browser.request("/app");
      assert.equal(current(tampered.html), name);
      assert.ok(!tampered.html.includes(otherId), "UUID alheio não deve aparecer na resposta");
      const rejected = await choose(browser, otherId);
      assert.equal(rejected.response.status, 303);
      assert.equal(rejected.response.headers.get("location"), "/app?selection=failed");
      assert.equal(current((await browser.request("/app")).html), name);
      console.log(`PASS shell: cliente ${profile.toUpperCase()} automático; cookie e action cruzados recusados`);
    }

    for (const organizationId of [orgA, orgB]) {
      const selected = await choose(admin, organizationId);
      assert.equal(selected.response.status, 303);
      assert.equal(selected.response.headers.get("location"), "/app");
      const cookie = selected.response.headers.getSetCookie().find(value => value.startsWith(`${cookieName}=`));
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /Secure/i);
      assert.match(cookie, /SameSite=lax/i);
      for (let index = 0; index < routes.length; index++) {
        const page = await admin.request(routes[index]);
        assert.equal(page.response.status, 200);
        assert.equal(current(page.html), expectedNames[organizationId]);
        assert.ok(page.html.includes(`>${titles[index]}</h1>`));
        assert.match(page.response.headers.get("cache-control"), /private.*no-store/);
      }
      assert.equal(current((await admin.request("/app")).html), expectedNames[organizationId]);
    }
    console.log("PASS shell: admin seleciona A/B; seis páginas e refresh preservam contexto privado");

    const invalid = await choose(admin, "invalid");
    assert.equal(invalid.response.headers.get("location"), "/app?selection=failed");
    admin.jar.set(cookieName, "invalid");
    adminPage = await admin.request("/app");
    assert.equal(current(adminPage.html), "Nenhuma empresa selecionada");
    assert.ok(adminPage.html.includes("A seleção anterior não está disponível"));
    const none = await login(users.none);
    none.jar.set(cookieName, encodeURIComponent(`${users.none.id}:${orgA}`));
    const empty = await none.request("/app");
    assert.equal(current(empty.html), "Nenhuma empresa selecionada");
    assert.ok(empty.html.includes("Nenhuma empresa vinculada à sua conta."));
    assert.ok(!empty.html.includes(expectedNames[orgA]));
    console.log("PASS shell: seleção inválida e usuário sem vínculo não resolvem empresa");

    const multi = await login(users.multi);
    assert.equal(current((await multi.request("/app")).html), "Nenhuma empresa selecionada");
    await choose(multi, orgA);
    assert.equal(current((await multi.request("/app")).html), expectedNames[orgA]);
    // UUIDs vêm das fixtures locais geradas/validadas pela suíte chamadora.
    sql(`delete from public.organization_members where user_id='${users.multi.id}' and organization_id='${orgA}';`);
    try {
      assert.equal(current((await multi.request("/app/avaliacoes")).html), expectedNames[orgB]);
    } finally {
      sql(`insert into public.organization_members(organization_id,user_id) values ('${orgA}','${users.multi.id}');`);
    }
    console.log("PASS shell: múltiplos vínculos e revogação reavaliados na próxima navegação");

    await testAdmin({ users, orgA, orgB, sql, session, login, formFields });

    await choose(admin, orgB);
    adminPage = await admin.request("/app");
    const loggedOut = await admin.request("/app", formFields(adminPage.html, ">Sair</button>"));
    assert.equal(loggedOut.response.status, 303);
    assert.equal(loggedOut.response.headers.get("location"), "/login");
    assert.equal(admin.jar.has(cookieName), false);
    assert.equal((await admin.request("/app/nfc")).response.status, 307);
    console.log("PASS shell: logout remove preferência e encerra acesso autenticado");
  } finally {
    if (server.exitCode === null) {
      const stopped = once(server, "exit");
      server.kill();
      await stopped;
    }
  }
}
