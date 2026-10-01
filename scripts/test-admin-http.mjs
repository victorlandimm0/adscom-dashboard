// Executado apenas pelo harness local de test:dashboard. Reutiliza sessão e fixtures.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function testAdmin({ users, orgA, orgB, sql, session, login, formFields }) {
  const name = `TESTE ADMIN ${randomUUID()}`;
  const routes = ["/admin", "/admin/empresas", `/admin/empresas/${orgA}`, `/admin/empresas/${orgB}`];
  const admin = await login(users.admin);
  const list = await admin.request("/admin/empresas");
  assert.equal(list.response.status, 200);
  assert.ok(list.html.includes(orgA) && list.html.includes(orgB));
  const companyA = await admin.request(`/admin/empresas/${orgA}`);
  assert.ok(companyA.html.includes(users.a.id));
  assert.ok(!companyA.html.includes(users.a.email), "E-mail de cliente não deve ser exposto");
  const createForm = formFields(list.html, 'name="name"');
  const linkForm = formFields(companyA.html, ">Vincular usuário</button>");
  const removeForm = formFields(companyA.html, ">Remover vínculo</button>");
  const post = async (browser, path, template, values) => {
    const form = new FormData();
    for (const [key, value] of template) form.set(key, value);
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return browser.request(path, form);
  };
  const expectRedirect = (result, location) => {
    assert.equal(result.response.status, 303);
    assert.equal(result.response.headers.get("location"), location);
  };
  const snapshot = () => sql(`select organization_id,user_id,role from public.organization_members where organization_id in ('${orgA}','${orgB}') order by organization_id,user_id;`);
  const before = snapshot();
  try {
    for (const [profile, browser, redirectTo] of [["anônimo", session(), "/login"], ["A", await login(users.a), "/app"], ["B", await login(users.b), "/app"]]) {
      for (const route of routes) {
        const result = await browser.request(route);
        assert.equal(result.response.status, 307);
        assert.equal(result.response.headers.get("location"), redirectTo);
        assert.ok(!result.html.includes(users.a.id));
      }
      expectRedirect(await post(browser, "/admin/empresas", createForm, { name }), redirectTo);
      expectRedirect(await post(browser, `/admin/empresas/${orgB}`, linkForm, { organization_id: orgB, user_id: users.none.id, role: "ADMIN_ADSCOM" }), redirectTo);
      expectRedirect(await post(browser, `/admin/empresas/${orgB}`, removeForm, { organization_id: orgA, user_id: users.a.id, confirmation: "confirm" }), redirectTo);
      assert.equal(snapshot(), before);
      console.log(`PASS admin: ${profile} bloqueado em URLs e POSTs de criar/vincular/remover`);
    }
    for (const client of [users.a.client, users.b.client]) {
      assert.equal((await client.from("organizations").insert({ name })).error?.code, "42501");
      assert.equal((await client.from("organization_members").insert({ organization_id: orgA, user_id: users.none.id })).error?.code, "42501");
      const removed = await client.from("organization_members").delete().eq("organization_id", orgA).eq("user_id", users.a.id).select("user_id");
      assert.equal(removed.error, null);
      assert.deepEqual(removed.data, []);
    }
    assert.equal(snapshot(), before);
    console.log("PASS admin: clientes A/B também bloqueados pela API Supabase direta");

    for (const route of routes) {
      const result = await admin.request(route);
      assert.equal(result.response.status, 200);
      assert.match(result.response.headers.get("cache-control"), /private.*no-store/);
    }
    for (const invalidName of ["   ", "x".repeat(161)]) {
      expectRedirect(await post(admin, "/admin/empresas", createForm, { name: invalidName }), "/admin/empresas?status=invalid-name");
    }
    const created = await post(admin, "/admin/empresas", createForm, { name: `  ${name}  ` });
    assert.equal(created.response.status, 303);
    const location = created.response.headers.get("location");
    assert.match(location, /^\/admin\/empresas\/[0-9a-f-]{36}\?status=created$/);
    const path = location.split("?")[0];
    const createdId = path.split("/").at(-1);
    let detail = await admin.request(path);
    assert.ok(detail.html.includes(name));
    assert.ok(detail.html.includes("Nenhum usuário vinculado."));
    assert.equal(sql(`select name from public.organizations where id='${createdId}';`).trim(), name);
    assert.equal(sql(`select count(*) from public.organization_members where organization_id='${createdId}';`).trim(), "0");
    assert.ok((await admin.request("/admin/empresas")).html.includes(createdId));
    console.log("PASS admin: cria empresa com trim e sem membership artificial; lista e detalhe disponíveis");

    const newLinkForm = formFields(detail.html, ">Vincular usuário</button>");
    expectRedirect(await post(admin, path, newLinkForm, { user_id: "invalid" }), `${path}?status=invalid-id`);
    expectRedirect(await post(admin, path, newLinkForm, { user_id: randomUUID() }), `${path}?status=not-found`);
    expectRedirect(await post(admin, path, newLinkForm, { organization_id: "invalid", user_id: users.none.id }), "/admin/empresas?status=invalid-id");
    expectRedirect(await post(admin, path, newLinkForm, { organization_id: randomUUID(), user_id: users.none.id }), "/admin/empresas?status=unavailable");
    expectRedirect(await post(admin, path, newLinkForm, { user_id: users.none.id, role: "ADMIN_ADSCOM" }), `${path}?status=linked`);
    expectRedirect(await post(admin, path, newLinkForm, { user_id: users.none.id }), `${path}?status=duplicate`);
    assert.equal(sql(`select role from public.organization_members where organization_id='${createdId}' and user_id='${users.none.id}';`).trim(), "CLIENTE");
    assert.equal(sql(`select count(*) from public.user_global_roles where user_id='${users.none.id}';`).trim(), "0");
    detail = await admin.request(path);
    assert.ok(detail.html.includes(users.none.id));
    const removal = formFields(detail.html, ">Remover vínculo</button>");
    removal.delete("confirmation");
    expectRedirect(await post(admin, path, removal, {}), `${path}?status=confirmation-required`);
    assert.equal(sql(`select count(*) from public.organization_members where organization_id='${createdId}' and user_id='${users.none.id}';`).trim(), "1");
    expectRedirect(await post(admin, path, removal, { confirmation: "confirm" }), `${path}?status=removed`);
    assert.ok((await admin.request(path)).html.includes("Nenhum usuário vinculado."));
    assert.equal(sql(`select count(*) from auth.users where id='${users.none.id}';`).trim(), "1");
    assert.equal(snapshot(), before);
    console.log("PASS admin: UUIDs validados, FK/duplicidade tratadas, papel fixo CLIENTE e remoção exige confirmação");

    // Usuário com outros vínculos: remover o novo não afeta suas empresas originais.
    expectRedirect(await post(admin, path, newLinkForm, { user_id: users.multi.id }), `${path}?status=linked`);
    const multiDetail = await admin.request(path);
    const multiRemoval = formFields(multiDetail.html, ">Remover vínculo</button>");
    expectRedirect(await post(admin, path, multiRemoval, { confirmation: "confirm" }), `${path}?status=removed`);
    assert.equal(snapshot(), before);
    assert.equal(sql(`select count(*) from auth.users where id='${users.multi.id}';`).trim(), "1");
    console.log("PASS admin: remoção preserva usuário Auth e demais memberships");

    for (const invalidId of ["invalid", randomUUID()]) {
      const response = await admin.request(`/admin/empresas/${invalidId}`);
      // Com streaming, Next pode transmitir notFound em HTML com HTTP 200.
      assert.ok(response.response.status === 404 || response.html.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
      assert.ok(!response.html.includes('name="user_id"'));
    }
    const openDashboard = formFields(companyA.html, ">Abrir no Dashboard</button>");
    expectRedirect(await admin.request(`/admin/empresas/${orgA}`, openDashboard), "/app");
    const dashboard = await admin.request("/app");
    assert.match(decodeURIComponent(admin.jar.get("adscom_organization")), new RegExp(`${orgA}$`));
    assert.ok(dashboard.html.includes('href="/admin"'));
    assert.equal((await admin.request("/app/relatorios")).response.status, 200);
    console.log("PASS admin: IDs indisponíveis sem detalhe; Abrir no Dashboard reutiliza seleção existente");

    const revoked = await login(users.admin2);
    sql(`delete from public.user_global_roles where user_id='${users.admin2.id}' and role='ADMIN_ADSCOM';`);
    try {
      assert.equal((await revoked.request("/admin")).response.headers.get("location"), "/app");
      expectRedirect(await post(revoked, "/admin/empresas", createForm, { name }), "/app");
    } finally {
      sql(`insert into public.user_global_roles(user_id,role) values ('${users.admin2.id}','ADMIN_ADSCOM');`);
    }
    const adminHome = await admin.request("/admin");
    expectRedirect(await admin.request("/admin", formFields(adminHome.html, ">Sair</button>")), "/login");
    assert.equal(admin.jar.has("adscom_organization"), false);
    assert.equal((await admin.request("/admin")).response.headers.get("location"), "/login");
    console.log("PASS admin: papel revogado bloqueia nova requisição/action; logout administrativo funciona");
  } finally {
    // Nome exclusivo desta execução; não toca nas empresas A/B existentes ou em Auth.
    sql(`begin;
      delete from public.organization_members where organization_id in (select id from public.organizations where name='${name}');
      delete from public.organizations where name='${name}';
      commit;`);
    assert.equal(sql(`select count(*) from public.organizations where name='${name}';`).trim(), "0");
    console.log("Fixture de empresa administrativa removida do banco local.");
  }
}
