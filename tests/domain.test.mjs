import { test } from "node:test";
import assert from "node:assert/strict";
import { roundRobin, roundDate, validScore } from "../lib/domain.ts";
import { hashPassword, checkPassword } from "../lib/password.mjs";
for (const count of [2, 3, 4, 5, 8, 9, 16, 25, 100])
  test(`Round robin for ${count} players: complete, no duplicates or double booking`, () => {
    const players = Array.from({ length: count }, (_, i) => String(i));
    const rounds = roundRobin(players);
    const pairs = new Set(),
      rests = new Map();
    assert.equal(rounds.length, count % 2 ? count : count - 1);
    for (const r of rounds) {
      const seen = new Set();
      for (const [a, b] of r.pairs) {
        assert.notEqual(a, b);
        assert.ok(!seen.has(a) && !seen.has(b));
        seen.add(a);
        seen.add(b);
        const key = [a, b].sort().join("|");
        assert.ok(!pairs.has(key));
        pairs.add(key);
      }
      if (count % 2) {
        assert.ok(r.rest && !seen.has(r.rest));
        rests.set(r.rest, (rests.get(r.rest) || 0) + 1);
      } else assert.equal(r.rest, null);
    }
    assert.equal(pairs.size, (count * (count - 1)) / 2);
    if (count % 2) for (const p of players) assert.equal(rests.get(p), 1);
  });
test("Reject duplicate and insufficient players", () => {
  assert.throws(() => roundRobin(["a"]));
  assert.throws(() => roundRobin(["a", "a"]));
});
test("Round dates use calendar days across month and year boundaries", () => {
  assert.equal(roundDate("2026-12-28", 2, 7), "2027-01-04");
  assert.equal(roundDate("2028-02-26", 2, 3), "2028-02-29");
});
test("Only valid winning results are accepted", () => {
  for (const s of [
    [3, 0],
    [3, 1],
    [3, 2],
    [0, 3],
  ])
    assert.ok(validScore(...s, 3));
  for (const s of [
    [3, 3],
    [2, 1],
    [-1, 3],
    [4, 0],
    [3, 1.5],
  ])
    assert.ok(!validScore(...s, 3));
  assert.ok(validScore(2, 1, 2));
});
test("Passwords are salted and verified without plaintext storage", async () => {
  const a = await hashPassword("an-example-password"),
    b = await hashPassword("an-example-password");
  assert.notEqual(a, b);
  assert.ok(await checkPassword("an-example-password", a));
  assert.ok(!(await checkPassword("incorrect", a)));
});
