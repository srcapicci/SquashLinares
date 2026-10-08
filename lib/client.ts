export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "player";
};
export type Tournament = {
  id: string;
  name: string;
  start_date: string;
  deadline: string;
  interval_days: number;
  games_to_win: number;
  state: "draft" | "published";
};
export type Group = { id: string; name: string; capacity: number };
export type Entry = {
  id: string;
  name: string;
  email?: string;
  group_id: string | null;
  is_member?: boolean;
  active?: boolean;
};
export type Game = {
  id: string;
  group_id: string;
  round_number: number;
  proposed_date: string;
  player_a: string;
  player_b: string;
  name_a: string;
  name_b: string;
  score_a: number | null;
  score_b: number | null;
  completed_at: string | null;
};
export type Detail = {
  tournament: Tournament;
  entries: Entry[];
  groups: Group[];
  games: Game[];
  myEntry: Entry | null;
  invite: { expires_at: string; revoked: boolean } | null;
  mail: { sent: number; pending: number } | null;
};
export type Notice = {
  id: string;
  tournament_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
};
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/club/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la operación");
  return data;
}
export function day(value: string) {
  return new Date(value.slice(0, 10) + "T12:00:00Z").toLocaleDateString(
    "es-ES",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Madrid",
    },
  );
}
