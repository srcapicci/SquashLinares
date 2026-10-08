import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { chromium } from "@playwright/test";
import { tokenHash } from "../lib/password.mjs";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const ids = [];
let browser;
const password = "Test-" + randomUUID(),
  suffix = randomUUID().slice(0, 8);
try {
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::integer AS n FROM app_users WHERE role='admin'",
      )
    ).rows[0].n,
    0,
    "Run this first-access test only in a development database without administrators.",
  );
  assert.equal(
    (await (await fetch(base + "/api/club/setup")).json()).available,
    true,
  );
  const responses = await Promise.all(
    [0, 1].map(async (i) => {
      const r = await fetch(base + "/api/club/setup", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "First Run " + i,
          email: `first${i}-${suffix}@example.test`,
          password,
        }),
      });
      const body = await r.json();
      if (body.user) ids.push(body.user.id);
      return r.status;
    }),
  );
  assert.deepEqual(responses.sort(), [201, 409]);
  assert.equal(
    (await (await fetch(base + "/api/club/setup")).json()).available,
    false,
  );
  for (const id of ids)
    await db.query("DELETE FROM app_users WHERE id=$1", [id]);
  ids.length = 0;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(base);
  await page.getByRole("link", { name: "Configurar mi club" }).click();
  await page.getByLabel("Nombre y apellidos").fill("First Run Browser");
  await page
    .getByLabel("Correo electrónico")
    .fill(`first-browser-${suffix}@example.test`);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Crear mi cuenta y entrar" }).click();
  await page.waitForURL("**/admin");
  await page.getByRole("heading", { name: "Torneos", exact: true }).waitFor();
  const user = (
    await db.query("SELECT id FROM app_users WHERE email=$1", [
      `first-browser-${suffix}@example.test`,
    ])
  ).rows[0];
  ids.push(user.id);
  await page.goto(base + "/configurar");
  await page
    .getByText("La configuración inicial está cerrada.", { exact: false })
    .waitFor();
  console.log(
    "First-run OK: browser setup creates and signs in the first administrator; concurrent requests cannot create a second one; setup closes after account creation.",
  );
} finally {
  if (browser) await browser.close();
  // Clean up only the accounts from this run, including if the browser fails after creating one.
  await db.query("DELETE FROM app_users WHERE email=ANY($1::text[])", [
    [
      `first0-${suffix}@example.test`,
      `first1-${suffix}@example.test`,
      `first-browser-${suffix}@example.test`,
    ],
  ]);
  await db.query("DELETE FROM app_rate_limits WHERE key=$1", [
    tokenHash("first-admin-setup"),
  ]);
  await db.end();
}
