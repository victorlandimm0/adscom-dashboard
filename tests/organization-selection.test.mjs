import assert from "node:assert/strict";
import { test } from "node:test";
import { isOrganizationId, resolveOrganization } from "../src/lib/organizations/selection.ts";

const a = { id: "20000000-0000-4000-8000-000000000001", name: "Empresa A" };
const b = { id: "20000000-0000-4000-8000-000000000002", name: "Empresa B" };
const user = "10000000-0000-4000-8000-000000000001";
const preference = (organization) => `${user}:${organization.id}`;

test("empresa única é automática para clientes A/B, mesmo com cookie alheio", () => {
  assert.equal(resolveOrganization([a], undefined, user).currentOrganization, a);
  assert.equal(resolveOrganization([b], undefined, user).currentOrganization, b);
  assert.deepEqual(resolveOrganization([a], preference(b), user), { currentOrganization: a, invalidSelection: true });
  assert.equal(resolveOrganization([b], preference(a), user).currentOrganization, b);
});

test("múltiplas empresas exigem escolha explícita e aceitam A/B autorizadas", () => {
  assert.equal(resolveOrganization([a, b], undefined, user).currentOrganization, null);
  assert.equal(resolveOrganization([a, b], preference(a), user).currentOrganization, a);
  assert.equal(resolveOrganization([a, b], preference(b), user).currentOrganization, b);
});

test("cookie inválido, de outra conta ou vínculo revogado não concede acesso", () => {
  for (const value of ["invalid", `${user}:invalid`, `${user}:${a.id}:extra`, `${user}:${a.id}:`, `another-user:${a.id}`]) {
    assert.deepEqual(resolveOrganization([a, b], value, user), { currentOrganization: null, invalidSelection: true });
  }
  assert.equal(resolveOrganization([], preference(a), user).currentOrganization, null);
  assert.equal(resolveOrganization([b], preference(a), user).currentOrganization, b);
});

test("identificador de seleção rejeita tipo inesperado e formato inválido", () => {
  for (const value of [null, undefined, new Blob(["id"]), "", "bad-id", `${a.id} OR true`]) assert.equal(isOrganizationId(value), false);
  assert.equal(isOrganizationId(a.id), true);
});
