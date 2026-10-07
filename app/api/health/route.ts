import { database } from "../../../lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await database().query("SELECT 1");
    return Response.json({ status: "ok", database: "connected" });
  } catch {
    return Response.json(
      { status: "unavailable", database: "disconnected" },
      { status: 503 },
    );
  }
}
