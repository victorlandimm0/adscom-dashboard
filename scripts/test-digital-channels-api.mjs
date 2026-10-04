// Somente pelo harness LOCAL: mesmas sessoes, destino fixo e limpeza em finally.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function testDigitalChannels({ users, orgA, orgB, anonymous, organizationIds, runId }) {
  const admin = users.admin.client;
  const table = (client = admin) => client.from("digital_channels");
  const success = (result) => {
    assert.equal(result.error?.code ?? null, null, "Operacao autorizada de canal falhou");
    return result.data;
  };
  const denied = (result) => assert.equal(result.error?.code, "42501", "Esperado bloqueio de canal");
  const passed = (label) => console.log(`PASS canais ${label}`);
  const read = async (id) => success(await table().select("*").eq("id", id).single());
  const base = { organization_id: orgA, type: "SITE", url: "https://example.test/channel" };
  const units = success(await admin.from("locations").select("id,organization_id").in("organization_id", [orgA, orgB]).order("id"));
  const [a1, a2] = units.filter(unit => unit.organization_id === orgA).map(unit => unit.id);
  const b1 = units.find(unit => unit.organization_id === orgB)?.id;
  assert.ok(a1 && a2 && b1, "Fixtures de locations necessarias");

  const orgC = success(await admin.from("organizations").insert({ name: `TESTE API ${runId} CHANNEL` }).select("id").single()).id;
  organizationIds.push(orgC);
  assert.deepEqual(success(await admin.from("locations").select("id").eq("organization_id", orgC)), []);
  const institutional = success(await table().insert({ ...base, organization_id: orgC }).select("*").single());
  assert.equal(institutional.location_id, null);
  assert.ok(institutional.id && Number.isFinite(Date.parse(institutional.created_at)));
  assert.equal(institutional.created_at, institutional.updated_at);
  passed("H: institucional em empresa sem unidades e defaults");

  const local = success(await table().insert({ ...base, location_id: a1 }).select("*").single());
  const other = success(await table().insert({ ...base, organization_id: orgB, location_id: b1 }).select("*").single());
  assert.equal(local.location_id, a1);
  passed("I: local valido");
  for (const type of ["SITE", "WHATSAPP", "GOOGLE_BUSINESS_PROFILE"]) {
    assert.equal(success(await table().insert({ ...base, type, location_id: null }).select("location_id").single()).location_id, null);
  }
  passed("K: NULL valido nos tres tipos");
  const duplicate = success(await table().insert({ ...base, location_id: a1 }).select("id").single());
  assert.notEqual(duplicate.id, local.id);
  passed("L: type e URL repetidos permitidos");

  const all = success(await table().select("*").in("organization_id", [orgA, orgB, orgC]));
  assert.equal(all.length, 7);
  const ids = (organizations) => all.filter(row => organizations.includes(row.organization_id)).map(row => row.id).sort();
  for (const [profile, own, opposite] of [["a", orgA, other.id], ["b", orgB, local.id]]) {
    const client = users[profile].client;
    assert.deepEqual(success(await table(client).select("id")).map(row => row.id).sort(), ids([own]));
    assert.deepEqual(success(await table(client).select("*").eq("id", opposite)), []);
    denied(await table(client).insert({ ...base, organization_id: own }));
    denied(await table(client).insert({ ...base, organization_id: own === orgA ? orgB : orgA }));
    const target = own === orgA ? local.id : other.id;
    const before = await read(target);
    assert.deepEqual(success(await table(client).update({ url: "https://example.test/denied" }).eq("id", target).select("id")), []);
    assert.deepEqual(success(await table(client).update({ location_id: null }).eq("id", target).select("id")), []);
    denied(await table(client).delete().eq("id", target));
    assert.deepEqual(await read(target), before, "Escritas negadas devem preservar a linha inteira");
  }
  passed("A-F: clientes A/B isolados inclusive UUID direto; INSERT/URL/location/DELETE negados");
  assert.deepEqual(success(await table(users.multi.client).select("id")).map(row => row.id).sort(), ids([orgA, orgB]));
  assert.deepEqual(success(await table(users.none.client).select("id")), []);
  assert.deepEqual(success(await table(users.none.client).select("*").eq("id", local.id)), []);
  assert.deepEqual(success(await admin.from("organization_members").select("user_id").eq("user_id", users.admin.id)), []);
  passed("G: admin global sem membership; multiempresa e sem vinculo");

  denied(await table(anonymous).select("*"));
  denied(await table(anonymous).insert(base));
  denied(await table(anonymous).update({ url: base.url }).eq("id", local.id));
  denied(await table(anonymous).delete().eq("id", local.id));
  passed("M: anonimo sem acesso");

  for (const location_id of [b1, randomUUID()]) {
    assert.equal((await table().insert({ ...base, location_id })).error?.code, "23503");
    const before = await read(local.id);
    assert.equal((await table().update({ location_id }).eq("id", local.id)).error?.code, "23503");
    assert.deepEqual(await read(local.id), before);
  }
  assert.equal((await table().insert({ ...base, organization_id: randomUUID(), location_id: null })).error?.code, "23503");
  passed("J: FK recusa INSERT/UPDATE entre tenants e referencias inexistentes");

  // Compara a precisao textual do PostgreSQL, sem truncar microssegundos via Date.
  let current = await read(local.id);
  for (const [patch, label] of [
    [{ url: "https://example.test/edited" }, "O: URL"],
    [{ location_id: a2 }, "P: outra unidade da mesma empresa"],
    [{ location_id: null }, "R: unidade para NULL"],
    [{ location_id: a1 }, "Q: NULL para unidade"],
    [{ location_id: null, url: "https://example.test/both" }, "URL e unidade simultaneamente"],
  ]) {
    const next = success(await table().update(patch).eq("id", local.id).select("*").single());
    for (const field of ["id", "organization_id", "type", "created_at"]) assert.equal(next[field], local[field]);
    for (const [field, value] of Object.entries(patch)) assert.equal(next[field], value);
    assert.notEqual(next.updated_at, current.updated_at, "UPDATE real precisa manter updated_at no banco");
    current = next;
    passed(label);
  }
  const noOp = success(await table().update({ url: current.url, location_id: current.location_id }).eq("id", local.id).select("*").single());
  assert.deepEqual(noOp, current, "No-op inclusive NULL preserva timestamp");
  passed("U: trigger automatico em cada mudanca; no-op preservado");

  for (const patch of [
    { organization_id: orgB }, { type: "WHATSAPP" }, { id: randomUUID() },
    { created_at: "2000-01-01T00:00:00Z" }, { updated_at: "2000-01-01T00:00:00Z" },
    { organization_id: orgB, url: "https://example.test/denied" },
  ]) {
    denied(await table().update(patch).eq("id", local.id));
    assert.deepEqual(await read(local.id), current);
  }
  for (const extra of [{ id: randomUUID() }, { created_at: "2000-01-01T00:00:00Z" }, { updated_at: "2000-01-01T00:00:00Z" }]) {
    denied(await table().insert({ ...base, ...extra }));
  }
  denied(await table().delete().eq("id", local.id));
  assert.deepEqual(await read(local.id), current);
  passed("S/T/V: tenant, type, id e timestamps protegidos; admin sem DELETE");

  for (const url of ["", "http://example.test", "javascript:alert(1)", "data:text/plain,x", "/relative", "https://", "https:///path", "https://?query", "https://#fragment", "https://user:pass@example.test", " https://example.test", "https://example.test ", "https://example.test/\t", "https://example.test/\n", "https://example.test/\u0001"]) {
    assert.equal((await table().insert({ ...base, url })).error?.code, "23514");
    assert.equal((await table().update({ url }).eq("id", local.id)).error?.code, "23514");
    assert.deepEqual(await read(local.id), current);
  }
  passed("W: esquemas inseguros, autoridade vazia/credenciais e whitespace rejeitados");
  const boundary = "https://example.test/" + "x".repeat(2048 - "https://example.test/".length);
  assert.equal(boundary.length, 2048);
  success(await table().insert({ ...base, url: boundary }));
  assert.equal((await table().insert({ ...base, url: boundary + "x" })).error?.code, "23514");
  assert.equal((await table().update({ url: boundary + "x" }).eq("id", local.id)).error?.code, "23514");
  assert.deepEqual(await read(local.id), current);
  passed("X: fronteiras 2048/2049");
  for (const type of ["", "site", "SITE ", "INSTAGRAM"]) assert.equal((await table().insert({ ...base, type })).error?.code, "23514");
  for (const field of ["organization_id", "type", "url"]) assert.equal((await table().insert({ ...base, [field]: null })).error?.code, "23502");
  assert.equal(success(await table().select("id").in("organization_id", [orgA, orgB, orgC])).length, 8, "Tentativas rejeitadas nao criaram canais");
  passed("constraints adicionais e persistencia apos tentativas negadas");
  return { channelA: local.id, channelB: other.id };
}
