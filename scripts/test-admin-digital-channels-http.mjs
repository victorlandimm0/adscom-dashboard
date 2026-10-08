// Exclusivamente fixtures do harness local; sem requisições aos destinos cadastrados.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function testAdminDigitalChannels({ users, orgA, orgB, sql, session, login, formFields, admin, post, expectRedirect }) {
  const path = `/admin/empresas/${orgA}`;
  const marker = randomUUID();
  const base = `https://example.test/${marker}/`;
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const quoted = ids.map(id => `'${id}'`).join(",");
  const snapshot = () => sql(`select id,organization_id,location_id,type,url,created_at,updated_at from public.digital_channels where url like '${base}%' order by id;`).trim();
  const read = async id => {
    const result = await users.admin.client.from("digital_channels").select("*").eq("id", id).single();
    assert.equal(result.error, null);
    return result.data;
  };
  try {
    sql(`insert into public.locations(id,organization_id,name) values ('${ids[0]}','${orgA}','Canal A1 ${marker}'),('${ids[1]}','${orgA}','Canal A2 ${marker}'),('${ids[2]}','${orgB}','Canal B ${marker}');`);
    const initial = await admin.request(path);
    assert.ok(initial.html.includes("Nenhum canal digital cadastrado."));
    const create = formFields(initial.html, 'id="channel-type"');
    assert.ok(!create.has("organization_id"));
    const values = { type: "SITE", location_id: "", url: `${base}site` };
    const socialLabels = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", TIKTOK: "TikTok", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube" };
    for (const [type, location_id, suffix] of [["SITE", "", "site"], ["WHATSAPP", "", "whatsapp"], ["GOOGLE_BUSINESS_PROFILE", ids[0], "google"], ["SITE", "", "duplicate"], ...Object.keys(socialLabels).map(type => [type, "", type.toLowerCase()])]) {
      expectRedirect(await post(admin, path, create, { type, location_id, url: base + suffix, organization_id: orgB, id: randomUUID(), created_at: "2000-01-01" }), `${path}?status=channel-created`);
    }
    const rows = await users.admin.client.from("digital_channels").select("*").like("url", `${base}%`).order("url");
    assert.equal(rows.error, null);
    assert.equal(rows.data.length, 9);
    for (const type of Object.keys(socialLabels)) assert.ok(rows.data.some(row => row.type === type && row.url === base + type.toLowerCase()));
    assert.ok(rows.data.every(row => row.organization_id === orgA && !row.created_at.startsWith("2000")));
    const current = rows.data.find(row => row.url === values.url);
    const foreign = await users.admin.client.from("digital_channels").insert({ ...values, location_id: ids[2], organization_id: orgB, url: `${base}foreign` }).select("id").single();
    assert.equal(foreign.error, null);
    const listed = await admin.request(path);
    for (const row of rows.data) assert.ok(listed.html.includes(row.id));
    for (const label of Object.values(socialLabels)) assert.ok(listed.html.includes(`<h3 class="font-medium">${label}</h3>`));
    console.log("PASS canais sociais admin: cinco novos tipos criados por action, persistidos e listados com labels");
    assert.ok(!listed.html.includes(`${base}foreign`) && !listed.html.includes(`Canal B ${marker}`));
    assert.ok(listed.html.includes("Perfil da Empresa no Google") && listed.html.includes("Institucional") && listed.html.includes(`Local — Canal A1 ${marker}`));
    const edit = formFields(listed.html, `value="${current.id}"`);
    assert.equal(edit.has("type"), false);
    const channelSection = listed.html.split('aria-labelledby="digital-channels"')[1].split('aria-labelledby="link-member"')[0];
    assert.ok(!/Excluir|Arquivar|Remover canal/.test(channelSection));
    const before = snapshot();
    for (const type of ["", "OTHER", "site"]) expectRedirect(await post(admin, path, create, { ...values, type }), `${path}?status=invalid-channel-type`);
    const prefix = "https://example.test/";
    for (const url of ["", "http://example.test", "https://user:pass@example.test", "https://example.test/ ", "https://example.test/\n", prefix + "x".repeat(2049 - prefix.length)]) {
      expectRedirect(await post(admin, path, create, { ...values, url }), `${path}?status=invalid-channel-url`);
      expectRedirect(await post(admin, path, edit, { ...values, url }), `${path}?status=invalid-channel-url`);
    }
    for (const [location_id, status] of [[ids[2], "unavailable"], [randomUUID(), "unavailable"], ["invalid", "invalid-id"]]) {
      for (const form of [create, edit]) expectRedirect(await post(admin, path, form, { ...values, location_id }), `${path}?status=${status}`);
    }
    for (const [channel_id, status] of [[foreign.data.id, "unavailable"], [randomUUID(), "unavailable"], ["invalid", "invalid-id"]]) expectRedirect(await post(admin, path, edit, { ...values, channel_id }), `${path}?status=${status}`);
    assert.equal(snapshot(), before);
    console.log("PASS canais admin A-F/K-O/S: listagem, tipos, duplicatas, vazio, validação e pares entre empresas");

    for (const browser of [session(), await login(users.a), await login(users.b)]) {
      const target = browser.jar.size ? "/app" : "/login";
      assert.equal((await browser.request(path)).response.headers.get("location"), target);
      expectRedirect(await post(browser, path, create, values), target);
      expectRedirect(await post(browser, path, edit, values), target);
      assert.equal(snapshot(), before);
    }
    const revoked = await login(users.admin2);
    sql(`delete from public.user_global_roles where user_id='${users.admin2.id}' and role='ADMIN_ADSCOM';`);
    try {
      expectRedirect(await post(revoked, path, create, values), "/app");
      expectRedirect(await post(revoked, path, edit, values), "/app");
      assert.equal(snapshot(), before);
    } finally {
      sql(`insert into public.user_global_roles(user_id,role) values ('${users.admin2.id}','ADMIN_ADSCOM');`);
    }
    for (const location_id of [ids[0], ids[1], ""]) {
      const url = `${base}corrected-${location_id || "institutional"}`;
      expectRedirect(await post(admin, path, edit, { location_id, url, type: "WHATSAPP", organization_id: orgB, id: foreign.data.id, created_at: "2000-01-01", updated_at: "2000-01-01" }), `${path}?status=channel-updated`);
      const row = await read(current.id);
      assert.equal(row.url, url);
      assert.equal(row.location_id, location_id || null);
      for (const key of ["id", "organization_id", "type", "created_at"]) assert.equal(row[key], current[key]);
      assert.ok((await admin.request(path)).html.includes(url));
    }
    const long = base + "x".repeat(2048 - base.length);
    expectRedirect(await post(admin, path, edit, { location_id: "", url: long }), `${path}?status=channel-updated`);
    assert.equal((await read(current.id)).url, long);
    assert.equal((await read(foreign.data.id)).url, `${base}foreign`);
    console.log("PASS canais admin G-J/P-R/T: edição persistida, limite 2048, imutáveis, clientes/anônimo/revogação");
  } finally {
    sql(`delete from public.digital_channels where organization_id in ('${orgA}','${orgB}') and url like '${base}%'; delete from public.locations where id in (${quoted});`);
    assert.equal(snapshot(), "");
    assert.equal(sql(`select count(*) from public.locations where id in (${quoted});`).trim(), "0");
    console.log("Fixtures administrativas de canais e unidades removidas.");
  }
}
