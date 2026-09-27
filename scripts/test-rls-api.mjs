// Teste de integração SOMENTE LOCAL. Não lê .env.local nem aceita URL remota.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const apiUrl = "http://127.0.0.1:54321";
const container = "supabase_db_adscom-dashboard";
const runId = randomUUID();
const orgA = randomUUID();
const orgB = randomUUID();
const organizationIds = [orgA, orgB];
const userIds = [];
const clients = [];
let fixturesStarted = false;

function sql(statement) {
  // stdin evita colocar SQL/identidades na linha de comando do processo.
  return execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], {
    input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
}

function uuidLiteral(value) {
  assert.match(value, /^[0-9a-f-]{36}$/i);
  return `'${value}'`;
}

function success(result) {
  assert.equal(result.error?.code ?? null, null, "Operação autorizada falhou");
  return result.data;
}

function forbidden(result) {
  assert.equal(result.error?.code, "42501", "Esperado bloqueio por grants/RLS");
}

function passed(label) { console.log(`PASS ${label}`); }

try {
  execFileSync("docker", ["version"], { stdio: "pipe" });
  const context = JSON.parse(execFileSync("docker", ["context", "inspect"], { encoding: "utf8", stdio: "pipe" }));
  assert.match(context[0].Endpoints.docker.Host, /^(npipe|unix):/, "Docker precisa ser local");
  const status = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: "pipe" }));
  assert.equal(new URL(status.API_URL).origin, apiUrl);
  // Chave pública local. Nenhuma service_role/secret é usada nas requisições.
  const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
  assert.ok(key, "Chave pública local indisponível");
  const newClient = () => {
    const client = createClient(apiUrl, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    clients.push(client);
    return client;
  };
  const anonymous = newClient();
  // Garante que as migrations existem ANTES de criar usuários.
  sql("select count(*) from public.organizations; select count(*) from public.user_global_roles;");
  fixturesStarted = true;
  const users = {};
  for (const name of ["a", "b", "multi", "none", "admin", "admin2"]) {
    const client = newClient();
    const result = await client.auth.signUp({ email: `rls-${runId}-${name}@example.test`, password: `${randomUUID()}aA!9` });
    assert.equal(result.error, null, "Criação de usuário local falhou");
    if (result.data.user) userIds.push(result.data.user.id);
    assert.ok(result.data.session, "Teste exige confirmação de e-mail desativada somente no Auth local");
    users[name] = { id: result.data.user.id, client };
  }
  const id = (name) => uuidLiteral(users[name].id);
  sql(`begin;
    insert into public.organizations(id,name) values (${uuidLiteral(orgA)},'TESTE API ${runId} A'),(${uuidLiteral(orgB)},'TESTE API ${runId} B');
    insert into public.organization_members(organization_id,user_id) values
      (${uuidLiteral(orgA)},${id("a")}),(${uuidLiteral(orgB)},${id("b")}),
      (${uuidLiteral(orgA)},${id("multi")}),(${uuidLiteral(orgB)},${id("multi")});
    insert into public.user_global_roles(user_id,role) values (${id("admin")},'ADMIN_ADSCOM'),(${id("admin2")},'ADMIN_ADSCOM');
    commit;`);
  const a = users.a.client;
  const admin = users.admin.client;
  const tokenBefore = (await a.auth.getSession()).data.session.access_token;
  assert.deepEqual(success(await a.from("organizations").select("id")).map(r => r.id), [orgA]); passed("A: cliente A vê somente A");
  assert.deepEqual(success(await a.from("organizations").select("id").eq("id", orgB)), []); passed("B: UUID de B invisível");
  forbidden(await a.from("organizations").insert({ name: `TESTE API ${runId} negado` })); passed("C: cliente não cria empresa");
  forbidden(await a.from("organization_members").insert({ organization_id: orgB, user_id: users.a.id })); passed("D: cliente não cria vínculo");
  forbidden(await a.from("user_global_roles").insert({ user_id: users.a.id, role: "ADMIN_ADSCOM" })); passed("E: autoelevação negada");
  const visible = success(await admin.from("organizations").select("id").in("id", [orgA, orgB]));
  assert.equal(visible.length, 2); passed("F: administrador vê A e B");
  const created = success(await admin.from("organizations").insert({ name: `TESTE API ${runId} C` }).select("id").single());
  organizationIds.push(created.id); passed("G: administrador cria empresa");
  forbidden(await anonymous.from("organizations").select("id")); passed("H: anônimo sem acesso");
  success(await admin.from("organization_members").delete().eq("organization_id", orgA).eq("user_id", users.a.id));
  assert.deepEqual(success(await a.from("organizations").select("id")), []);
  assert.equal((await a.auth.getSession()).data.session.access_token, tokenBefore); passed("I: revogação efetiva com o mesmo JWT");

  assert.deepEqual(success(await users.b.client.from("organizations").select("id")).map(r => r.id), [orgB]);
  assert.equal(success(await users.multi.client.from("organizations").select("id")).length, 2);
  assert.deepEqual(success(await users.none.client.from("organizations").select("id")), []);
  passed("B isolado, múltiplos vínculos e usuário sem vínculo");
  assert.equal(success(await admin.from("user_global_roles").select("user_id")).length, 1);
  forbidden(await admin.from("user_global_roles").insert({ user_id: users.none.id, role: "ADMIN_ADSCOM" }));
  forbidden(await admin.from("user_global_roles").delete().eq("user_id", users.admin.id));
  forbidden(await admin.from("organizations").delete().eq("id", orgA));
  assert.deepEqual(success(await users.b.client.from("organizations").update({ name: "TESTE INDEVIDO" }).eq("id", orgB).select("id")), []);
  assert.deepEqual(success(await users.b.client.from("organization_members").update({ organization_id: orgA }).eq("user_id", users.b.id).select("user_id")), []);
  passed("Escritas proibidas e leitura restrita de papéis");
  sql(`delete from public.user_global_roles where user_id=${id("admin")};`);
  assert.deepEqual(success(await admin.from("organizations").select("id")), []);
  passed("Revogação de administrador sem renovar sessão");
} catch {
  // Não imprimir erros SDK/CLI completos: podem conter chaves ou sessões.
  console.error("FAIL: teste local não concluído. Verifique Docker local, npm run db:start, migrations e Auth local. Cenários sem PASS continuam pendentes.");
  process.exitCode = 1;
} finally {
  for (const client of clients) client.auth.stopAutoRefresh();
  if (fixturesStarted) {
    try {
      // Limpeza somente de UUIDs desta execução, no contêiner local fixo.
      const organizations = organizationIds.map(uuidLiteral).join(",");
      const users = userIds.map(uuidLiteral).join(",");
      sql(`begin;
        delete from public.organization_members where organization_id in (${organizations});
        delete from public.organizations where id in (${organizations}) or name in ('TESTE API ${runId} C','TESTE API ${runId} negado');
        ${users ? `delete from auth.users where id in (${users});` : ""}
        commit;`);
      console.log("Fixtures locais desta execução removidas.");
    } catch {
      console.error(`Limpeza pendente: fixtures TESTE API ${runId}; usuários rls-${runId}-*@example.test no ambiente LOCAL. Não execute este teste no remoto.`);
      process.exitCode = 1;
    }
  }
}
