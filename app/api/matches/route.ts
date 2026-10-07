import { database } from "../../../lib/db";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const group = new URL(request.url).searchParams.get("group");
  if (group !== null && !/^[123]$/.test(group))
    return Response.json({ error: "Grupo inválido" }, { status: 400 });
  try {
    const result = await database().query(
      "SELECT id, group_id, round_number, week_start, player_a, player_b FROM matches WHERE ($1::integer IS NULL OR group_id = $1) ORDER BY group_id, round_number, id",
      [group],
    );
    return Response.json({ matches: result.rows });
  } catch {
    return Response.json(
      { error: "Base de datos no disponible" },
      { status: 503 },
    );
  }
}
