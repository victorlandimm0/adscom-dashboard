import assert from "node:assert/strict";
import { test } from "node:test";
import { readCompanyName, readMembership } from "../src/lib/admin/validation.ts";
import { channelLabels, readChannelType, readChannelLocation, readChannelUrl } from "../src/lib/admin/validation.ts";
import { completeList } from "../src/lib/admin/complete-list.ts";

test("canais: tipos fechados e institucional explícito", () => {
  const expected = { SITE: "Site", WHATSAPP: "WhatsApp", GOOGLE_BUSINESS_PROFILE: "Perfil da Empresa no Google", INSTAGRAM: "Instagram", FACEBOOK: "Facebook", TIKTOK: "TikTok", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube" };
  assert.deepEqual(channelLabels, expected);
  for (const value of Object.keys(expected)) assert.equal(readChannelType(value), value);
  for (const value of [null, "", "site", "OTHER", "toString", new Blob()]) assert.equal(readChannelType(value), null);
  assert.equal(readChannelLocation(""), null);
  const id = "20000000-0000-4000-8000-000000000001";
  assert.equal(readChannelLocation(id), id);
  for (const value of [null, "null", "invalid", new Blob()]) assert.equal(readChannelLocation(value), undefined);
});

test("canais: HTTPS estrutural sem whitelist, normalização ou credenciais", () => {
  const prefix = "https://example.test/";
  for (const value of [prefix, "https://other.test/path?q=1", prefix + "x".repeat(2048 - prefix.length), prefix + "😀".repeat(2048 - prefix.length)]) assert.equal(readChannelUrl(value), value);
  for (const value of [null, new Blob(), "", "http://example.test", "https://", "https:///example.test", "https://a@b.test", "https://user:pass@example.test", "https://example.test/ ", "https://example.test/\n", "https://example.test/\u0000", "https://example.test/\u007f", "https://example.test\\@evil.test", prefix + "x".repeat(2049 - prefix.length)]) assert.equal(readChannelUrl(value), null);
});

test("listagem completa aceita limite menor da API e descarta resultados parciais", async () => {
  const values = [1, 2, 3, 4, 5];
  assert.deepEqual(await completeList(async from => ({ data: values.slice(from, from + 2), count: 5, error: null })), { data: values, error: false });
  for (const failure of [{ data: null, count: null, error: true }, { data: [], count: 5, error: null }, { data: [3], count: 6, error: null }]) {
    assert.deepEqual(await completeList(async from => from === 0 ? { data: [1, 2], count: 5, error: null } : failure), { data: [], error: true });
  }
  assert.deepEqual(await completeList(async () => ({ data: [], count: 0, error: null })), { data: [], error: false });
});

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
