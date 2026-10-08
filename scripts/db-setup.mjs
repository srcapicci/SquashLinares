import pg from "pg";
import { readFile } from "node:fs/promises";
const data = JSON.parse(
  await readFile(new URL("../data/tournament.json", import.meta.url), "utf8"),
);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`CREATE TABLE IF NOT EXISTS groups (id integer PRIMARY KEY, name text NOT NULL);
 CREATE TABLE IF NOT EXISTS players (id text PRIMARY KEY, group_id integer NOT NULL REFERENCES groups(id), name text NOT NULL, UNIQUE(group_id,name));
 CREATE TABLE IF NOT EXISTS matches (id text PRIMARY KEY, group_id integer NOT NULL REFERENCES groups(id), round_number integer NOT NULL, week_start date NOT NULL, player_a text NOT NULL REFERENCES players(id), player_b text NOT NULL REFERENCES players(id), CHECK(player_a <> player_b));`);
  for (const g of data.groups) {
    await client.query(
      "INSERT INTO groups VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [g.id, `Grupo ${g.id}`],
    );
    for (const [i, p] of g.players.entries())
      await client.query(
        "INSERT INTO players VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [`g${g.id}-p${i + 1}`, g.id, p],
      );
    for (const r of g.rounds)
      for (const m of r.matches)
        await client.query(
          "INSERT INTO matches VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
          [
            m.id,
            g.id,
            r.number,
            r.week,
            ...m.players.map((p) => `g${g.id}-p${g.players.indexOf(p) + 1}`),
          ],
        );
  }
  await client.query(
    await readFile(new URL("../db/001-club.sql", import.meta.url), "utf8"),
  );
  await client.query("COMMIT");
  const counts = await client.query(
    "SELECT (SELECT count(*) FROM players) AS players, (SELECT count(*) FROM matches) AS matches",
  );
  console.log("Database initialized:", counts.rows[0]);
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
