import { NextRequest, NextResponse } from "next/server";
import { database } from "./db";
import { tokenHash, newToken } from "./password.mjs";
export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "player";
};
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function currentUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get("squash_session")?.value;
  if (!token) return null;
  const { rows } = await database().query(
    "SELECT u.id,u.name,u.email,u.role FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
    [tokenHash(token)],
  );
  return rows[0] ?? null;
}
export async function requireUser(request: NextRequest, admin = false) {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, "Inicia sesión para continuar");
  if (admin && user.role !== "admin")
    throw new HttpError(403, "Solo administradores");
  return user;
}
export async function openSession(
  response: NextResponse,
  userId: string,
  request: NextRequest,
) {
  const old = request.cookies.get("squash_session")?.value;
  if (old)
    await database().query("DELETE FROM app_sessions WHERE token_hash=$1", [
      tokenHash(old),
    ]);
  const token = newToken();
  await database().query(
    "INSERT INTO app_sessions VALUES ($1,$2,now()+interval '7 days')",
    [tokenHash(token), userId],
  );
  response.cookies.set("squash_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(process.env.APP_URL || request.url).protocol === "https:",
    path: "/",
    maxAge: 604800,
  });
}
export function checkOrigin(request: NextRequest) {
  const expected = new URL(process.env.APP_URL || request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new HttpError(403, "Origen de la solicitud no permitido");
}
export async function rateLimit(key: string, max: number) {
  const { rows } = await database().query(
    `INSERT INTO app_rate_limits VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN app_rate_limits.reset_at<now() THEN 1 ELSE app_rate_limits.attempts+1 END, reset_at=CASE WHEN app_rate_limits.reset_at<now() THEN now()+interval '15 minutes' ELSE app_rate_limits.reset_at END RETURNING attempts`,
    [tokenHash(key)],
  );
  if (rows[0].attempts > max)
    throw new HttpError(
      429,
      "Demasiados intentos. Vuelve a intentarlo en 15 minutos.",
    );
}
