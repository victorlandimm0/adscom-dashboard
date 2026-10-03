// Somente fixtures do harness local; nenhuma URL/credencial remota é aceita aqui.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function testAdminLocations({ users, orgA, orgB, sql, session, login, formFields, admin, post, expectRedirect }) {
  const path = `/admin/empresas/${orgA}`;
  const name = `TESTE UNIDADE ${randomUUID()}`;
  const createdIds = [];
  const snapshot = () => sql(`select id,organization_id,name,created_at from public.locations where organization_id in ('${orgA}','${orgB}') order by id;`);
  const detail = await admin.request(path);
  assert.ok(detail.html.includes("Nenhuma unidade cadastrada."));
  const create = formFields(detail.html, 'id="location-name"');
  assert.equal(create.has("organization_id"), false);
  const contextForm = (template, organizationId) => {
    // Simula argumento vinculado adulterado no POST HTML da Server Action.
    const form = new FormData();
    let replaced = false;
    for (const [key, value] of template) {
      if (typeof value === "string" && value.includes(orgA)) replaced = true;
      form.set(key, typeof value === "string" ? value.replaceAll(orgA, organizationId) : value);
    }
    assert.ok(replaced, "O formulário deve carregar o contexto vinculado da empresa");
    return form;
  };
  try {
    for (const invalidName of ["", "   ", "x".repeat(161)]) {
      expectRedirect(await post(admin, path, create, { name: invalidName }), `${path}?status=invalid-location-name`);
    }
    for (const [id, status] of [["invalid", "invalid-id"], [randomUUID(), "unavailable"]]) {
      expectRedirect(await post(admin, path, contextForm(create, id), { name }), `/admin/empresas?status=${status}`);
      const response = await admin.request(`/admin/empresas/${id}`);
      assert.ok(response.response.status === 404 || response.html.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
      assert.ok(!response.html.includes('id="location-name"'));
    }
    assert.equal(snapshot(), "");
    expectRedirect(await post(admin, path, create, { name: `  ${name}  `, organization_id: orgB, id: randomUUID(), created_at: "2000-01-01" }), `${path}?status=location-created`);
    const row = await users.admin.client.from("locations").select("id,organization_id,name,created_at").eq("name", name).single();
    assert.equal(row.error, null);
    assert.equal(row.data.organization_id, orgA);
    assert.equal(row.data.name, name);
    const idA = row.data.id;
    createdIds.push(idA);
    assert.ok(!row.data.created_at.startsWith("2000-01-01"));
    const other = await users.admin.client.from("locations").insert({ organization_id: orgB, name: `${name} B` }).select("id").single();
    assert.equal(other.error, null);
    const idB = other.data.id;
    createdIds.push(idB);
    const listed = await admin.request(`${path}?status=location-created`);
    assert.ok(listed.html.includes("Unidade cadastrada."));
    assert.ok(listed.html.includes(`<h3 class="break-words font-medium">${name}</h3>`));
    assert.ok(!listed.html.includes(idB) && !listed.html.includes(`${name} B`));
    const rename = formFields(listed.html, `value="${idA}"`);
    const before = snapshot();
    for (const invalidName of ["", "   ", "x".repeat(161)]) {
      expectRedirect(await post(admin, path, rename, { name: invalidName }), `${path}?status=invalid-location-name`);
    }
    for (const [id, status] of [["invalid", "invalid-id"], [randomUUID(), "unavailable"], [idB, "unavailable"]]) {
      expectRedirect(await post(admin, path, rename, { location_id: id, name: `${name} adulterada` }), `${path}?status=${status}`);
    }
    for (const [id, status] of [["invalid", "invalid-id"], [randomUUID(), "unavailable"]]) {
      expectRedirect(await post(admin, path, contextForm(rename, id), { name }), `/admin/empresas?status=${status}`);
    }
    assert.equal(snapshot(), before, "Falhas de validação e ID de B não podem alterar unidades");
    console.log("PASS unidades admin: estado vazio, criação com trim, associação, listagem isolada, nomes/UUIDs e contexto A + unidade B");

    for (const [profile, browser, destination] of [["anônimo", session(), "/login"], ["CLIENTE A", await login(users.a), "/app"], ["CLIENTE B", await login(users.b), "/app"]]) {
      expectRedirect(await post(browser, path, create, { name }), destination);
      expectRedirect(await post(browser, path, rename, { name: `${name} bloqueada` }), destination);
      const denied = await browser.request(path);
      assert.equal(denied.response.headers.get("location"), destination);
      assert.ok(!denied.html.includes('id="location-name"'));
      assert.equal(snapshot(), before);
      console.log(`PASS unidades admin: ${profile} sem interface e sem mutations`);
    }
    const revoked = await login(users.admin2);
    sql(`delete from public.user_global_roles where user_id='${users.admin2.id}' and role='ADMIN_ADSCOM';`);
    try {
      expectRedirect(await post(revoked, path, create, { name }), "/app");
      expectRedirect(await post(revoked, path, rename, { name: `${name} revogada` }), "/app");
      assert.equal((await revoked.request(path)).response.headers.get("location"), "/app");
      assert.equal(snapshot(), before);
    } finally {
      sql(`insert into public.user_global_roles(user_id,role) values ('${users.admin2.id}','ADMIN_ADSCOM');`);
    }
    const updatedName = `${name} renomeada`;
    expectRedirect(await post(admin, path, rename, { name: ` ${updatedName} `, organization_id: orgB, id: idB, created_at: "2000-01-01" }), `${path}?status=location-updated`);
    const updated = await users.admin.client.from("locations").select("id,organization_id,name,created_at").eq("id", idA).single();
    assert.equal(updated.error, null);
    assert.deepEqual(updated.data, { ...row.data, name: updatedName });
    const refreshed = await admin.request(`${path}?status=location-updated`);
    assert.ok(refreshed.html.includes("Unidade atualizada.") && refreshed.html.includes(updatedName));
    assert.ok((await admin.request(path)).html.includes(updatedName));
    assert.equal(sql(`select name from public.locations where id='${idB}';`).trim(), `${name} B`);
    // Limite aceito e nomes iguais não recebem regra artificial de unicidade.
    expectRedirect(await post(admin, path, rename, { name: "x".repeat(160) }), `${path}?status=location-updated`);
    assert.equal(sql(`select length(name) from public.locations where id='${idA}';`).trim(), "160");
    expectRedirect(await post(admin, path, rename, { name: updatedName }), `${path}?status=location-updated`);
    expectRedirect(await post(admin, path, create, { name }), `${path}?status=location-created`);
    expectRedirect(await post(admin, path, create, { name }), `${path}?status=location-created`);
    assert.equal(sql(`select count(*) from public.locations where organization_id='${orgA}' and name='${name}';`).trim(), "2");
    console.log("PASS unidades admin: revogação, renomeação persistida, campos imutáveis, limite 160 e nomes repetidos permitidos");
  } finally {
    // A/B são exclusivamente fixtures do harness; remove só locations desta execução.
    const ids = createdIds.length ? `or id in (${createdIds.map(id => `'${id}'`).join(",")})` : "";
    sql(`delete from public.locations where organization_id in ('${orgA}','${orgB}') and (name like '${name}%' ${ids});`);
    assert.equal(snapshot(), "");
    console.log("Fixtures de unidades administrativas removidas do banco local.");
  }
}
