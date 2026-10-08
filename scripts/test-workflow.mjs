import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { hashPassword, tokenHash } from "../lib/password.mjs";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const mailpitUrl = process.env.MAILPIT_URL || "http://127.0.0.1:8025";
const artifactsDir = resolve(
  process.env.TEST_ARTIFACTS_DIR || "test-artifacts",
);
const run = randomUUID().slice(0, 8),
  password = "Test-" + randomUUID(),
  users = [],
  tournaments = [];
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const makeClient = () => ({ cookie: "", id: "" });
async function request(client, path, body, expected = 200, origin = base) {
  const r = await fetch(base + "/api/club/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: client.cookie,
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: origin }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  assert.equal(r.status, expected, `HTTP ${path}: ${data.error || r.status}`);
  const cookie = r.headers.get("set-cookie");
  if (cookie) client.cookie = cookie.split(";")[0];
  return data;
}
const anon = makeClient(),
  admin = makeClient(),
  clients = [];
let browser;
try {
  const adminEmail = `admin-${run}@example.test`;
  await promisify(execFile)(
    process.execPath,
    ["--env-file-if-exists=.env.local", "scripts/create-admin.mjs"],
    {
      env: {
        ...process.env,
        ADMIN_EMAIL: adminEmail,
        ADMIN_PASSWORD: password,
        ADMIN_NAME: "Test Admin",
      },
    },
  );
  admin.id = (
    await db.query("SELECT id FROM app_users WHERE email=$1", [adminEmail])
  ).rows[0].id;
  users.push(admin.id);
  await request(anon, "tournaments", undefined, 401);
  await request(
    admin,
    "auth/login",
    { email: adminEmail, password },
    403,
    "https://wrong.example",
  );

  await request(admin, "auth/login", { email: adminEmail, password }, 200);
  await request(
    admin,
    "tournaments",
    {
      name: "Blocked",
      start_date: "2026-10-19",
      deadline: "2026-12-30",
      interval_days: 7,
      games_to_win: 3,
    },
    403,
    "https://wrong.example",
  );
  const admin2 = await request(
    admin,
    "admins",
    { name: "Second Admin", email: `admin2-${run}@example.test`, password },
    201,
  );
  users.push(admin2.admin.id);
  const secondAdmin = makeClient();
  await request(secondAdmin, "auth/login", {
    email: `admin2-${run}@example.test`,
    password,
  });
  assert.equal(
    (await request(secondAdmin, "admins")).admins.some(
      (a) => a.id === admin.id,
    ),
    true,
  );
  const t = (
    await request(
      admin,
      "tournaments",
      {
        name: "Workflow " + run,
        start_date: "2026-10-19",
        deadline: "2026-12-30",
        interval_days: 7,
        games_to_win: 3,
      },
      201,
    )
  ).tournament;
  tournaments.push(t.id);
  const extra = (
    await request(
      admin,
      "tournaments",
      {
        name: "Independent " + run,
        start_date: "2026-11-01",
        deadline: "2026-12-31",
        interval_days: 7,
        games_to_win: 3,
      },
      201,
    )
  ).tournament;
  tournaments.push(extra.id);
  const old = (
    await request(admin, `tournaments/${t.id}/invite`, {
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
  ).url
    .split("/")
    .pop();
  const token = (
    await request(admin, `tournaments/${t.id}/invite`, {
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
  ).url
    .split("/")
    .pop();
  await request(anon, "invites/" + old, undefined, 410);
  await request(
    admin,
    `tournaments/${t.id}/invite`,
    { expires_at: new Date(Date.now() - 1000).toISOString() },
    400,
  );
  for (let i = 0; i < 4; i++) {
    const client = makeClient();
    const email = `player${i}-${run}@example.test`;
    const d = await request(
      client,
      "invites/" + token,
      { name: `Player ${i}`, email, password, is_member: i === 0 },
      201,
    );
    client.id = d.user.id;
    users.push(client.id);
    clients.push(client);
  }
  await request(
    anon,
    "invites/" + token,
    {
      name: "Duplicate",
      email: `player0-${run}@example.test`,
      password,
      is_member: false,
    },
    409,
  );
  if (process.argv.includes("--browser")) {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(base + "/inscripcion/" + token);
    await page.getByLabel("Nombre y apellidos").fill("Player 4");
    await page
      .getByLabel("Correo electrónico")
      .fill(`player4-${run}@example.test`);
    await page
      .getByLabel("Contraseña para acceder a tus partidos")
      .fill(password);
    await page.getByRole("button", { name: "Inscribirme" }).click();
    await page.waitForURL("**/jugador");
    await page.getByText("Inscripción registrada", { exact: true }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    const cookies = await context.cookies();
    const c = makeClient();
    c.cookie =
      "squash_session=" +
      cookies.find((x) => x.name === "squash_session").value;
    c.id = (await request(c, "session")).user.id;
    users.push(c.id);
    clients.push(c);
    await context.close();
  } else {
    const c = makeClient();
    const d = await request(
      c,
      "invites/" + token,
      {
        name: "Player 4",
        email: `player4-${run}@example.test`,
        password,
        is_member: false,
      },
      201,
    );
    c.id = d.user.id;
    users.push(c.id);
    clients.push(c);
  }
  await request(clients[0], "admins", undefined, 403);
  await request(clients[0], "tournaments/" + extra.id, undefined, 403);
  const ga = (
    await request(
      admin,
      `tournaments/${t.id}/groups`,
      { name: "Grupo A", capacity: 3 },
      201,
    )
  ).group;
  const gb = (
    await request(
      admin,
      `tournaments/${t.id}/groups`,
      { name: "Grupo B", capacity: 2 },
      201,
    )
  ).group;
  let detail = await request(admin, "tournaments/" + t.id);
  for (const [i, c] of clients.entries()) {
    const e = detail.entries.find(
      (e) => e.email === `player${i}-${run}@example.test`,
    );
    await request(admin, `tournaments/${t.id}/entries/${e.id}`, {
      group_id: i < 3 ? ga.id : gb.id,
      is_member: i === 0,
      active: true,
    });
  }
  detail = await request(admin, "tournaments/" + t.id);
  const e4 = detail.entries.find(
    (e) => e.email === `player4-${run}@example.test`,
  );
  await request(
    admin,
    `tournaments/${t.id}/entries/${e4.id}`,
    { group_id: ga.id, is_member: false, active: true },
    409,
  );
  assert.equal(
    (await request(admin, `tournaments/${t.id}/generate`, {})).count,
    4,
  );
  const expired = (
    await request(admin, `tournaments/${extra.id}/invite`, {
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
  ).url
    .split("/")
    .pop();
  await db.query(
    "UPDATE app_invites SET expires_at=now()-interval '1 second' WHERE tournament_id=$1",
    [extra.id],
  );
  await request(anon, "invites/" + expired, undefined, 410);
  await request(
    anon,
    "invites/" + expired,
    {
      name: "Expired",
      email: `expired-${run}@example.test`,
      password,
      is_member: false,
    },
    410,
  );
  assert.equal(
    (await request(admin, `tournaments/${t.id}/generate`, {})).count,
    4,
  );
  const publication = await request(
    secondAdmin,
    `tournaments/${t.id}/publish`,
    {},
  );
  assert.equal(publication.mail.sent, 5);
  assert.equal(publication.mail.failed, 0);
  await request(admin, `tournaments/${t.id}/publish`, {}, 409);
  assert.equal(
    (await request(admin, `tournaments/${t.id}/retry-mail`, {})).mail.sent,
    0,
  );
  await request(anon, "invites/" + token, undefined, 410);
  detail = await request(admin, "tournaments/" + t.id);
  const game = detail.games[0];
  const entryA = detail.entries.find((e) => e.id === game.player_a),
    entryB = detail.entries.find((e) => e.id === game.player_b);
  const owner = clients.find((c) => c.id === entryA.user_id),
    outsider = clients.find(
      (c) => c.id !== entryA.user_id && c.id !== entryB.user_id,
    );
  await request(
    outsider,
    "games/" + game.id + "/result",
    { score_a: 3, score_b: 0 },
    403,
  );
  await request(
    owner,
    "games/" + game.id + "/result",
    { score_a: 3, score_b: 3 },
    400,
  );
  const responses = await Promise.all(
    [0, 1].map(async (n) => {
      const r = await fetch(base + "/api/club/games/" + game.id + "/result", {
        method: "POST",
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          Cookie: owner.cookie,
        },
        body: JSON.stringify({ score_a: 3, score_b: n }),
      });
      return r.status;
    }),
  );
  assert.deepEqual(responses.sort(), [200, 409]);
  await request(admin, "games/" + game.id + "/result", {
    score_a: 1,
    score_b: 3,
  });
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::integer AS n FROM app_result_audit WHERE game_id=$1",
        [game.id],
      )
    ).rows[0].n,
    2,
  );
  const playerDetail = await request(owner, "tournaments/" + t.id);
  assert.ok(playerDetail.entries.every((e) => !("email" in e)));
  assert.ok(
    playerDetail.games.every(
      (g) =>
        g.player_a === playerDetail.myEntry.id ||
        g.player_b === playerDetail.myEntry.id,
    ),
  );
  const notices = (await request(owner, "notices")).notices;
  assert.ok(notices.some((n) => n.message.includes("publicado")));
  await request(owner, "notices/" + notices[0].id + "/read", {});
  assert.ok(
    (await request(owner, "notices")).notices.find(
      (n) => n.id === notices[0].id,
    ).read_at,
  );
  const mail = await (await fetch(mailpitUrl + "/api/v1/messages")).json();
  assert.ok(
    mail.messages.some(
      (m) => m.Subject === "Tu grupo y calendario · " + t.name,
    ),
  );
  if (browser) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto(base + "/acceso");
    await page.getByLabel("Correo electrónico").fill(adminEmail);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/admin");
    await page.getByRole("heading", { name: "Torneos", exact: true }).waitFor();
    await page.goto(base + "/admin/torneos/" + t.id);
    await page.getByRole("heading", { name: "3. Cuadro de juego" }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await mkdir(artifactsDir, { recursive: true });
    await page.screenshot({
      path: join(artifactsDir, "squash-admin-mobile.png"),
      fullPage: true,
    });
    await context.close();
    const latest = await request(admin, "tournaments/" + t.id);
    const pending = latest.games.find((g) => !g.completed_at);
    const participant = clients.find(
      (c) =>
        c.id === latest.entries.find((e) => e.id === pending.player_a).user_id,
    );
    const pc = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    await pc.addCookies([
      {
        name: "squash_session",
        value: participant.cookie.split("=")[1],
        url: base,
      },
    ]);
    const pp = await pc.newPage();
    await pp.goto(base + "/jugador?torneo=" + t.id);
    const card = pp
      .locator("article.round")
      .filter({ hasText: pending.name_a })
      .filter({ hasText: pending.name_b });
    await card.getByText("Anotar resultado", { exact: true }).click();
    await card.getByLabel("Juegos de " + pending.name_a).fill("3");
    await card.getByLabel("Juegos de " + pending.name_b).fill("0");
    await card.getByRole("button", { name: "Guardar resultado" }).click();
    await card.getByText("Finalizado", { exact: true }).waitFor();
    assert.ok(
      await pp.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await pp.screenshot({
      path: join(artifactsDir, "squash-player-mobile.png"),
      fullPage: true,
    });
    await pc.close();
  }
  await request(owner, "auth/logout", {});
  assert.equal((await request(owner, "session")).user, null);
  console.log(
    "Workflow OK: multiple administrators and tournaments, mobile registration, invite rotation/expiry, group capacity, odd/even schedules, email + app notices, player privacy, CSRF, result permissions/concurrency, corrections and logout.",
  );
} finally {
  if (browser) await browser.close();
  for (const id of tournaments)
    await db.query("DELETE FROM app_tournaments WHERE id=$1", [id]);
  for (const id of users) {
    await db.query("DELETE FROM app_users WHERE id=$1", [id]);
  }
  await db.query("DELETE FROM app_rate_limits WHERE key=ANY($1::text[])", [
    Array.from({ length: 2 }, (_, i) =>
      tokenHash("login:" + `admin${i ? "2" : ""}-${run}@example.test`),
    ),
  ]);
  await db.end();
}
