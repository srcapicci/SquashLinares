import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const data = JSON.parse(
  await readFile(new URL("../data/tournament.json", import.meta.url), "utf8"),
);
test("Import preserves 25 players and 92 scheduled matches from the PDF", () => {
  assert.equal(
    data.groups.reduce((n, g) => n + g.players.length, 0),
    25,
  );
  assert.equal(
    data.groups.flatMap((g) => g.rounds.flatMap((r) => r.matches)).length,
    92,
  );
});
for (const g of data.groups)
  test(`Group ${g.id}: players are valid and each round has no double bookings`, () => {
    for (const r of g.rounds) {
      const seen = new Set();
      for (const m of r.matches) {
        assert.equal(m.players.length, 2);
        for (const p of m.players) {
          assert.ok(g.players.includes(p));
          assert.ok(!seen.has(p));
          seen.add(p);
        }
      }
      if (r.rest) {
        assert.ok(g.players.includes(r.rest));
        assert.ok(!seen.has(r.rest));
      }
    }
  });
test("Groups 1 and 2 have all unique round-robin pairings", () => {
  for (const g of data.groups.slice(0, 2)) {
    const pairs = g.rounds.flatMap((r) =>
      r.matches.map((m) => [...m.players].sort().join("|")),
    );
    assert.equal(new Set(pairs).size, 28);
  }
});
test("Group 3 preserves documented calendar defects pending club correction", () => {
  const pairs = data.groups[2].rounds.flatMap((r) =>
    r.matches.map((m) => [...m.players].sort().join("|")),
  );
  assert.equal(new Set(pairs).size, 34);
  assert.equal(
    pairs.filter((p) => p === "David Gálvez|José Soriano").length,
    2,
  );
  assert.equal(
    pairs.filter((p) => p === "Fernando Moreno|Manuel Reyes").length,
    2,
  );
});
