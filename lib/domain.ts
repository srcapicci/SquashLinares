export function roundRobin(players: string[]) {
  if (players.length < 2 || new Set(players).size !== players.length)
    throw new Error("Se requieren al menos dos jugadores diferentes");
  const rotation: (string | null)[] = [...players];
  if (rotation.length % 2) rotation.push(null);
  const rounds: {
    number: number;
    rest: string | null;
    pairs: [string, string][];
  }[] = [];
  for (let number = 1; number < rotation.length; number++) {
    const pairs: [string, string][] = [];
    let rest: string | null = null;
    for (let i = 0; i < rotation.length / 2; i++) {
      const a = rotation[i],
        b = rotation[rotation.length - 1 - i];
      if (a && b) pairs.push([a, b].sort() as [string, string]);
      else rest = a ?? b;
    }
    rounds.push({ number, rest, pairs });
    rotation.splice(1, 0, rotation.pop()!);
  }
  return rounds;
}
export function roundDate(start: string, round: number, interval: number) {
  const date = new Date(start + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + (round - 1) * interval);
  return date.toISOString().slice(0, 10);
}
export function validScore(a: number, b: number, target: number) {
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= 0 &&
    b >= 0 &&
    ((a === target && b < target) || (b === target && a < target))
  );
}
