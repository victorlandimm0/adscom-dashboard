import assert from "node:assert/strict";
import { test } from "node:test";
import { readCompanyName, readMembership } from "../src/lib/admin/validation.ts";

test("nome administrativo de empresa/unidade exige texto, trim e limite de 160 caracteres", () => {
  assert.equal(readCompanyName("  Empresa A  "), "Empresa A");
  assert.equal(readCompanyName("a".repeat(160)), "a".repeat(160));
  assert.equal(readCompanyName("  Águas Claras  "), "Águas Claras");
  assert.equal(readCompanyName(`  ${"a".repeat(160)}  `), "a".repeat(160));
  for (const value of [null, "", "   ", "a".repeat(161), new Blob(["empresa"])]) assert.equal(readCompanyName(value), null);
});

test("vínculo valida ambos os UUIDs e não recebe papel do formulário", () => {
  const id = "20000000-0000-4000-8000-000000000001";
  const form = new FormData();
  assert.equal(readMembership(form), null);
  form.set("organization_id", id); form.set("user_id", "invalid");
  assert.equal(readMembership(form), null);
  form.set("user_id", id); form.set("role", "ADMIN_ADSCOM");
  assert.deepEqual(readMembership(form), { organizationId: id, userId: id });
  form.set("organization_id", new Blob([id]), "id.txt");
  assert.equal(readMembership(form), null);
});
