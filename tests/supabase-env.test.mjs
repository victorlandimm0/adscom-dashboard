import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getSupabaseEnvironment } from "../src/lib/supabase/env.ts";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
afterEach(() => {
  for (const [name, value] of [
    ["NEXT_PUBLIC_SUPABASE_URL", originalUrl],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalKey],
  ]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("configuração ausente falha sem expor valores", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.throws(getSupabaseEnvironment, /Configure NEXT_PUBLIC_SUPABASE_URL/);
});

test("chave secret ou JWT não é aceita no cliente publicável", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  for (const key of ["sb_secret_invalid_test", "eyJ.invalid.test"]) {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
    assert.throws(getSupabaseEnvironment, /Use uma Publishable Key/);
  }
});

test("HTTPS com placeholder publicável é aceito sem fazer requisições", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_invalid_test";
  assert.equal(getSupabaseEnvironment().url, "https://example.supabase.co");
});

test("HTTP remoto é recusado e localhost é permitido", () => {
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_invalid_test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://example.com";
  assert.throws(getSupabaseEnvironment, /deve usar HTTPS/);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  assert.equal(getSupabaseEnvironment().url, "http://127.0.0.1:54321");
});
