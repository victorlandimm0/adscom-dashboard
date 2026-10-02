// Chamado apenas pelo harness local: sem env, credenciais ou destino proprios.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function testLocations({ users, orgA, orgB, anonymous }) {
  const admin = users.admin.client;
  const success = (result) => {
    assert.equal(result.error?.code ?? null, null, "Operacao autorizada de unidade falhou");
    return result.data;
  };
  const denied = (result) => assert.equal(result.error?.code, "42501", "Esperado bloqueio de unidade");
  assert.deepEqual(success(await admin.from("locations").select("id").in("organization_id", [orgA, orgB])), []);
  const units = success(await admin.from("locations").insert([
    { organization_id: orgA, name: "TESTE A1" },
    { organization_id: orgA, name: "TESTE A2" },
    { organization_id: orgB, name: "TESTE B1" },
    { organization_id: orgB, name: "TESTE B2" },
  ]).select("id, organization_id, name, created_at"));
  assert.equal(units.length, 4);
  assert.ok(units.every(unit => unit.id && Number.isFinite(Date.parse(unit.created_at))));
  const ids = (org) => units.filter(unit => unit.organization_id === org).map(unit => unit.id).sort();
  for (const [profile, own, other] of [["a", orgA, orgB], ["b", orgB, orgA]]) {
    const client = users[profile].client;
    const visible = success(await client.from("locations").select("id").in("organization_id", [orgA, orgB]));
    assert.deepEqual(visible.map(unit => unit.id).sort(), ids(own));
    assert.deepEqual(success(await client.from("locations").select("id").eq("id", ids(other)[0])), []);
    denied(await client.from("locations").insert({ organization_id: own, name: "TESTE negado" }));
    denied(await client.from("locations").insert({ organization_id: other, name: "TESTE negado" }));
    assert.deepEqual(success(await client.from("locations").update({ name: "TESTE negado" }).eq("id", ids(own)[0]).select("id")), []);
    denied(await client.from("locations").update({ organization_id: other }).eq("id", ids(own)[0]));
    denied(await client.from("locations").delete().eq("id", ids(own)[0]));
  }
  assert.equal(success(await users.multi.client.from("locations").select("id").in("organization_id", [orgA, orgB])).length, 4);
  assert.deepEqual(success(await users.none.client.from("locations").select("id").in("organization_id", [orgA, orgB])), []);
  denied(await anonymous.from("locations").select("id"));
  denied(await anonymous.from("locations").insert({ organization_id: orgA, name: "TESTE anonimo" }));
  assert.equal(success(await admin.from("locations").select("id").in("organization_id", [orgA, orgB])).length, 4);
  const updated = success(await admin.from("locations").update({ name: "TESTE editada" }).eq("id", ids(orgA)[0]).select("name"));
  assert.deepEqual(updated, [{ name: "TESTE editada" }]);
  denied(await admin.from("locations").update({ organization_id: orgB }).eq("id", ids(orgA)[0]));
  denied(await admin.from("locations").update({ id: randomUUID() }).eq("id", ids(orgA)[0]));
  denied(await admin.from("locations").update({ created_at: new Date().toISOString() }).eq("id", ids(orgA)[0]));
  denied(await admin.from("locations").delete().eq("id", ids(orgA)[0]));
  assert.equal((await admin.from("locations").insert({ organization_id: randomUUID(), name: "TESTE orfa" })).error?.code, "23503");
  assert.equal((await admin.from("locations").insert({ name: "TESTE sem empresa" })).error?.code, "23502");
  for (const name of ["   ", "x".repeat(161)]) {
    assert.equal((await admin.from("locations").insert({ organization_id: orgA, name })).error?.code, "23514");
  }
  console.log("PASS locations: 0/N unidades, A/B por UUID, multi/sem vinculo, anonimo, admin cria/edita, FK/CHECK e escritas proibidas");
}
