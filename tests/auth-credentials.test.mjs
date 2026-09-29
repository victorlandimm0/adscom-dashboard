import assert from "node:assert/strict";
import { test } from "node:test";
import { readCredentials } from "../src/lib/auth/credentials.ts";

test("rejeita campos ausentes, arquivos e e-mail inválido", () => {
  const data = new FormData();
  assert.equal(readCredentials(data), null);
  data.set("email", "invalid"); data.set("password", "test");
  assert.equal(readCredentials(data), null);
  data.set("email", new Blob(["invalid"]), "email.txt");
  assert.equal(readCredentials(data), null);
});

test("normaliza e-mail sem modificar a senha existente", () => {
  const data = new FormData();
  data.set("email", " user@example.test "); data.set("password", "  senha de teste  ");
  assert.deepEqual(readCredentials(data), { email: "user@example.test", password: "  senha de teste  " });
});

test("rejeita senha vazia e entrada excessiva", () => {
  const data = new FormData(); data.set("email", "user@example.test");
  for (const password of ["", "x".repeat(4097)]) {
    data.set("password", password); assert.equal(readCredentials(data), null);
  }
});
