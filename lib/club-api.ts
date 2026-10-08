import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import type { PoolClient } from "pg";
import { database } from "./db";
import {
  HttpError,
  checkOrigin,
  currentUser,
  requireUser,
  openSession,
  rateLimit,
} from "./auth";
import {
  hashPassword,
  checkPassword,
  newToken,
  tokenHash,
} from "./password.mjs";
import { roundRobin, roundDate, validScore } from "./domain";
import { deliverMail } from "./mail";

const uuid = z.string().uuid();
const text = z.string().trim().min(1).max(120);
const email = z
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());
const password = z
  .string()
  .min(12, "La contraseña necesita al menos 12 caracteres")
  .max(128);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
  }, "Fecha inválida");
const account = z.object({ name: text, email, password });
async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const c = await database().connect();
  try {
    await c.query("BEGIN");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
async function lockedTournament(c: PoolClient, id: string, draft = true) {
  const { rows } = await c.query(
    "SELECT * FROM app_tournaments WHERE id=$1 FOR UPDATE",
    [uuid.parse(id)],
  );
  if (!rows[0]) throw new HttpError(404, "Torneo no encontrado");
  if (draft && rows[0].state !== "draft")
    throw new HttpError(
      409,
      "El torneo ya está publicado. No se puede cambiar su composición.",
    );
  return rows[0];
}
async function invalidate(c: PoolClient, id: string) {
  await c.query("DELETE FROM app_games WHERE tournament_id=$1", [id]);
}
function reply(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handleClub(request: NextRequest, path: string[]) {
  try {
    const key = path.join("/"),
      method = request.method;
    if (method === "POST") checkOrigin(request);
    const body = method === "POST" ? await request.json() : null;
    if (key === "setup" && method === "GET") {
      if (process.env.FIRST_ADMIN_SETUP !== "true")
        return reply({ available: false });
      const { rows } = await database().query(
        "SELECT EXISTS(SELECT 1 FROM app_users WHERE role='admin') AS configured",
      );
      return reply({ available: !rows[0].configured });
    }
    if (key === "setup" && method === "POST") {
      if (process.env.FIRST_ADMIN_SETUP !== "true")
        throw new HttpError(403, "La configuración inicial no está habilitada");
      const input = account.parse(body);
      await rateLimit("first-admin-setup", 10);
      const user = await transaction(async (c) => {
        await c.query(
          "SELECT pg_advisory_xact_lock(hashtext('club-first-admin'))",
        );
        const { rows } = await c.query(
          "SELECT EXISTS(SELECT 1 FROM app_users WHERE role='admin') AS configured",
        );
        if (rows[0].configured)
          throw new HttpError(
            409,
            "El club ya tiene administrador. Inicia sesión.",
          );
        return (
          await c.query(
            "INSERT INTO app_users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') RETURNING id,name,email,role",
            [input.name, input.email, await hashPassword(input.password)],
          )
        ).rows[0];
      });
      const response = reply({ user }, 201);
      await openSession(response, user.id, request);
      return response;
    }
    if (key === "auth/login" && method === "POST") {
      const input = z
        .object({ email, password: z.string().max(128) })
        .parse(body);
      await rateLimit("login:" + input.email, 10);
      const { rows } = await database().query(
        "SELECT * FROM app_users WHERE email=$1",
        [input.email],
      );
      const hash = rows[0]?.password_hash ?? (await hashPassword(newToken()));
      if (!(await checkPassword(input.password, hash)) || !rows[0])
        throw new HttpError(401, "Correo o contraseña incorrectos");
      const response = reply({
        user: {
          id: rows[0].id,
          name: rows[0].name,
          email: rows[0].email,
          role: rows[0].role,
        },
      });
      await openSession(response, rows[0].id, request);
      return response;
    }
    if (key === "auth/logout" && method === "POST") {
      const token = request.cookies.get("squash_session")?.value;
      if (token)
        await database().query("DELETE FROM app_sessions WHERE token_hash=$1", [
          tokenHash(token),
        ]);
      const response = reply({ ok: true });
      response.cookies.set("squash_session", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
      });
      return response;
    }
    if (key === "session" && method === "GET")
      return reply({ user: await currentUser(request) });
    if (path[0] === "invites" && path.length === 2) {
      const token = z.string().min(40).max(60).parse(path[1]);
      if (method === "GET") {
        const { rows } = await database().query(
          "SELECT t.id,t.name,t.start_date,t.deadline,i.expires_at FROM app_invites i JOIN app_tournaments t ON t.id=i.tournament_id WHERE i.token_hash=$1 AND i.expires_at>now() AND NOT i.revoked AND t.state='draft'",
          [tokenHash(token)],
        );
        if (!rows[0])
          throw new HttpError(
            410,
            "Esta inscripción ha caducado o está cerrada",
          );
        return reply({ tournament: rows[0] });
      }
      if (method === "POST") {
        const input = account.extend({ is_member: z.boolean() }).parse(body);
        await rateLimit("register:" + token, 100);
        const result = await transaction(async (c) => {
          const { rows } = await c.query(
            "SELECT t.id,t.name FROM app_invites i JOIN app_tournaments t ON t.id=i.tournament_id WHERE i.token_hash=$1 AND i.expires_at>now() AND NOT i.revoked AND t.state='draft' FOR UPDATE OF t,i",
            [tokenHash(token)],
          );
          if (!rows[0])
            throw new HttpError(
              410,
              "Esta inscripción ha caducado o está cerrada",
            );
          let user = (
            await c.query("SELECT * FROM app_users WHERE email=$1", [
              input.email,
            ])
          ).rows[0];
          if (user) {
            if (!(await checkPassword(input.password, user.password_hash)))
              throw new HttpError(
                409,
                "Este correo ya tiene cuenta. Usa su contraseña para inscribirte.",
              );
          } else
            user = (
              await c.query(
                "INSERT INTO app_users(name,email,password_hash,role) VALUES ($1,$2,$3,'player') RETURNING id,name,email,role",
                [input.name, input.email, await hashPassword(input.password)],
              )
            ).rows[0];
          const entries = await c.query(
            "INSERT INTO app_entries(tournament_id,user_id,is_member) VALUES($1,$2,$3) ON CONFLICT(tournament_id,user_id) DO NOTHING RETURNING id",
            [rows[0].id, user.id, input.is_member],
          );
          if (!entries.rowCount)
            throw new HttpError(409, "Ya estás inscrito en este torneo");
          await invalidate(c, rows[0].id);
          await c.query(
            "INSERT INTO app_notices(user_id,tournament_id,message) VALUES($1,$2,$3)",
            [
              user.id,
              rows[0].id,
              "Tu inscripción en " +
                rows[0].name +
                " está registrada. Recibirás tu grupo y calendario cuando se publiquen.",
            ],
          );
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        });
        const response = reply({ user: result }, 201);
        await openSession(response, result.id, request);
        return response;
      }
    }
    const user = await requireUser(request);
    if (key === "notices" && method === "GET")
      return reply({
        notices: (
          await database().query(
            "SELECT id,tournament_id,message,read_at,created_at FROM app_notices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
            [user.id],
          )
        ).rows,
      });
    if (path[0] === "notices" && path[2] === "read" && method === "POST") {
      await database().query(
        "UPDATE app_notices SET read_at=now() WHERE id=$1 AND user_id=$2",
        [uuid.parse(path[1]), user.id],
      );
      return reply({ ok: true });
    }
    if (key === "tournaments" && method === "GET")
      return reply({
        tournaments: (
          await database().query(
            user.role === "admin"
              ? "SELECT * FROM app_tournaments ORDER BY created_at DESC"
              : "SELECT t.* FROM app_tournaments t JOIN app_entries e ON e.tournament_id=t.id WHERE e.user_id=$1 AND e.active ORDER BY t.created_at DESC",
            user.role === "admin" ? [] : [user.id],
          )
        ).rows,
      });
    if (path[0] === "tournaments" && path.length === 2 && method === "GET") {
      const id = uuid.parse(path[1]);
      const t = (
        await database().query("SELECT * FROM app_tournaments WHERE id=$1", [
          id,
        ])
      ).rows[0];
      if (!t) throw new HttpError(404, "Torneo no encontrado");
      const mine = (
        await database().query(
          "SELECT * FROM app_entries WHERE tournament_id=$1 AND user_id=$2 AND active",
          [id, user.id],
        )
      ).rows[0];
      if (user.role !== "admin" && !mine)
        throw new HttpError(403, "No estás inscrito en este torneo");
      const entries =
        user.role === "admin"
          ? (
              await database().query(
                "SELECT e.*,u.name,u.email FROM app_entries e JOIN app_users u ON u.id=e.user_id WHERE e.tournament_id=$1 ORDER BY u.name",
                [id],
              )
            ).rows
          : (
              await database().query(
                "SELECT e.id,e.group_id,u.name FROM app_entries e JOIN app_users u ON u.id=e.user_id WHERE e.tournament_id=$1 AND e.group_id=$2 AND e.active",
                [id, mine?.group_id],
              )
            ).rows;
      const groups = (
        await database().query(
          "SELECT * FROM app_groups WHERE tournament_id=$1 ORDER BY name",
          [id],
        )
      ).rows;
      const games = (
        await database().query(
          `SELECT g.*,ua.name AS name_a,ub.name AS name_b FROM app_games g JOIN app_entries a ON a.id=g.player_a JOIN app_users ua ON ua.id=a.user_id JOIN app_entries b ON b.id=g.player_b JOIN app_users ub ON ub.id=b.user_id WHERE g.tournament_id=$1 AND ($2::uuid IS NULL OR g.player_a=$2 OR g.player_b=$2) AND ($3::boolean OR $4::text='published') ORDER BY g.round_number,g.group_id,g.id`,
          [
            id,
            user.role === "admin" ? null : mine?.id,
            user.role === "admin",
            t.state,
          ],
        )
      ).rows;
      const invite =
        user.role === "admin"
          ? (
              await database().query(
                "SELECT expires_at,revoked FROM app_invites WHERE tournament_id=$1",
                [id],
              )
            ).rows[0]
          : null;
      const mail =
        user.role === "admin"
          ? (
              await database().query(
                "SELECT count(*) FILTER(WHERE sent_at IS NOT NULL)::integer AS sent,count(*) FILTER(WHERE sent_at IS NULL)::integer AS pending FROM app_mail WHERE tournament_id=$1",
                [id],
              )
            ).rows[0]
          : null;
      return reply({
        tournament: t,
        entries,
        groups,
        games,
        myEntry: mine ?? null,
        invite: invite ?? null,
        mail,
      });
    }
    if (path[0] === "games" && path[2] === "result" && method === "POST") {
      const input = z
        .object({
          score_a: z.number().int().min(0).max(5),
          score_b: z.number().int().min(0).max(5),
        })
        .parse(body);
      await transaction(async (c) => {
        const { rows } = await c.query(
          "SELECT g.*,t.games_to_win,t.state,a.user_id AS user_a,b.user_id AS user_b FROM app_games g JOIN app_tournaments t ON t.id=g.tournament_id JOIN app_entries a ON a.id=g.player_a JOIN app_entries b ON b.id=g.player_b WHERE g.id=$1 FOR UPDATE OF g",
          [uuid.parse(path[1])],
        );
        const g = rows[0];
        if (!g) throw new HttpError(404, "Partido no encontrado");
        if (
          user.role !== "admin" &&
          user.id !== g.user_a &&
          user.id !== g.user_b
        )
          throw new HttpError(403, "Solo puedes anotar tus partidos");
        if (g.state !== "published")
          throw new HttpError(409, "El calendario aún no está publicado");
        if (g.completed_at && user.role !== "admin")
          throw new HttpError(
            409,
            "Resultado ya registrado. Contacta con la administración para corregirlo.",
          );
        if (!validScore(input.score_a, input.score_b, g.games_to_win))
          throw new HttpError(
            400,
            "Marcador inválido para el número de juegos configurado",
          );
        await c.query(
          "INSERT INTO app_result_audit(game_id,actor_id,old_score_a,old_score_b,score_a,score_b) VALUES($1,$2,$3,$4,$5,$6)",
          [g.id, user.id, g.score_a, g.score_b, input.score_a, input.score_b],
        );
        await c.query(
          "UPDATE app_games SET score_a=$1,score_b=$2,reported_by=$3,completed_at=now() WHERE id=$4",
          [input.score_a, input.score_b, user.id, g.id],
        );
        for (const recipient of [g.user_a, g.user_b])
          await c.query(
            "INSERT INTO app_notices(user_id,tournament_id,message) VALUES($1,$2,$3)",
            [
              recipient,
              g.tournament_id,
              "Resultado registrado: " +
                input.score_a +
                "–" +
                input.score_b +
                ". Consulta tu calendario.",
            ],
          );
      });
      return reply({ ok: true });
    }
    if (user.role !== "admin") throw new HttpError(403, "Solo administradores");
    if (key === "admins" && method === "GET")
      return reply({
        admins: (
          await database().query(
            "SELECT id,name,email FROM app_users WHERE role='admin' ORDER BY name",
          )
        ).rows,
      });
    if (key === "admins" && method === "POST") {
      const input = account.parse(body);
      const { rows } = await database().query(
        "INSERT INTO app_users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') RETURNING id,name,email",
        [input.name, input.email, await hashPassword(input.password)],
      );
      return reply({ admin: rows[0] }, 201);
    }
    if (key === "tournaments" && method === "POST") {
      const input = z
        .object({
          name: text,
          start_date: date,
          deadline: date,
          interval_days: z.number().int().min(1).max(365),
          games_to_win: z.number().int().min(1).max(5),
        })
        .parse(body);
      if (input.deadline < input.start_date)
        throw new HttpError(400, "El límite debe ser posterior al inicio");
      const { rows } = await database().query(
        "INSERT INTO app_tournaments(name,start_date,deadline,interval_days,games_to_win,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [
          input.name,
          input.start_date,
          input.deadline,
          input.interval_days,
          input.games_to_win,
          user.id,
        ],
      );
      return reply({ tournament: rows[0] }, 201);
    }
    if (path[0] === "tournaments" && path.length >= 3 && method === "POST") {
      const id = uuid.parse(path[1]),
        action = path[2];
      if (action === "invite") {
        const input = z.object({ expires_at: z.iso.datetime() }).parse(body);
        const expiry = new Date(input.expires_at);
        if (+expiry <= Date.now() || +expiry > Date.now() + 365 * 86400000)
          throw new HttpError(
            400,
            "Elige una caducidad futura de hasta un año",
          );
        const token = newToken();
        await transaction(async (c) => {
          await lockedTournament(c, id);
          await c.query(
            "INSERT INTO app_invites(token_hash,tournament_id,expires_at) VALUES($1,$2,$3) ON CONFLICT(tournament_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,revoked=false",
            [tokenHash(token), id, expiry],
          );
        });
        const origin = new URL(process.env.APP_URL || request.url).origin;
        return reply({
          url: origin + "/inscripcion/" + token,
          expires_at: input.expires_at,
        });
      }
      if (action === "close-registration") {
        await transaction(async (c) => {
          await lockedTournament(c, id);
          await c.query(
            "UPDATE app_invites SET revoked=true WHERE tournament_id=$1",
            [id],
          );
        });
        return reply({ ok: true });
      }
      if (action === "settings") {
        const input = z
          .object({
            name: text,
            start_date: date,
            deadline: date,
            interval_days: z.number().int().min(1).max(365),
            games_to_win: z.number().int().min(1).max(5),
          })
          .parse(body);
        if (input.deadline < input.start_date)
          throw new HttpError(400, "El límite debe ser posterior al inicio");
        await transaction(async (c) => {
          await lockedTournament(c, id);
          await invalidate(c, id);
          await c.query(
            "UPDATE app_tournaments SET name=$1,start_date=$2,deadline=$3,interval_days=$4,games_to_win=$5 WHERE id=$6",
            [
              input.name,
              input.start_date,
              input.deadline,
              input.interval_days,
              input.games_to_win,
              id,
            ],
          );
        });
        return reply({ ok: true });
      }
      if (action === "groups" && path[4] === "remove") {
        await transaction(async (c) => {
          await lockedTournament(c, id);
          const groupId = uuid.parse(path[3]);
          const entries = await c.query(
            "SELECT id FROM app_entries WHERE tournament_id=$1 AND group_id=$2",
            [id, groupId],
          );
          if (entries.rowCount)
            throw new HttpError(
              409,
              "Desasigna los jugadores antes de eliminar el grupo",
            );
          await invalidate(c, id);
          await c.query(
            "DELETE FROM app_groups WHERE id=$1 AND tournament_id=$2",
            [groupId, id],
          );
        });
        return reply({ ok: true });
      }
      if (action === "groups") {
        const input = z
          .object({ name: text, capacity: z.number().int().min(2).max(100) })
          .parse(body);
        const group = await transaction(async (c) => {
          await lockedTournament(c, id);
          await invalidate(c, id);
          return (
            await c.query(
              "INSERT INTO app_groups(tournament_id,name,capacity) VALUES($1,$2,$3) RETURNING *",
              [id, input.name, input.capacity],
            )
          ).rows[0];
        });
        return reply({ group }, 201);
      }
      if (action === "entries" && path.length === 4) {
        const input = z
          .object({
            group_id: uuid.nullable(),
            is_member: z.boolean(),
            active: z.boolean(),
          })
          .parse(body);
        await transaction(async (c) => {
          const tournament = await lockedTournament(c, id, false);
          const entry = (
            await c.query(
              "SELECT * FROM app_entries WHERE id=$1 AND tournament_id=$2 FOR UPDATE",
              [uuid.parse(path[3]), id],
            )
          ).rows[0];
          if (!entry) throw new HttpError(404, "Jugador no encontrado");
          if (tournament.state === "published") {
            if (
              input.group_id !== entry.group_id ||
              input.active !== entry.active
            )
              throw new HttpError(
                409,
                "El torneo publicado no permite cambiar participantes ni grupos",
              );
            await c.query("UPDATE app_entries SET is_member=$1 WHERE id=$2", [
              input.is_member,
              entry.id,
            ]);
            return;
          }
          if (input.group_id) {
            const group = (
              await c.query(
                "SELECT * FROM app_groups WHERE id=$1 AND tournament_id=$2",
                [input.group_id, id],
              )
            ).rows[0];
            if (!group)
              throw new HttpError(400, "El grupo no pertenece al torneo");
            const { rows } = await c.query(
              "SELECT count(*)::integer AS count FROM app_entries WHERE group_id=$1 AND active AND id<>$2",
              [input.group_id, entry.id],
            );
            if (input.active && rows[0].count >= group.capacity)
              throw new HttpError(409, "El grupo está completo");
          }
          await invalidate(c, id);
          await c.query(
            "UPDATE app_entries SET group_id=$1,is_member=$2,active=$3 WHERE id=$4",
            [
              input.active ? input.group_id : null,
              input.is_member,
              input.active,
              entry.id,
            ],
          );
        });
        return reply({ ok: true });
      }
      if (action === "generate") {
        const count = await transaction(async (c) => {
          const t = await lockedTournament(c, id);
          const entries = (
            await c.query(
              "SELECT * FROM app_entries WHERE tournament_id=$1 AND active ORDER BY created_at,id",
              [id],
            )
          ).rows;
          if (!entries.length || entries.some((e) => !e.group_id))
            throw new HttpError(
              409,
              "Asigna todos los jugadores activos a un grupo",
            );
          const groups = (
            await c.query(
              "SELECT * FROM app_groups WHERE tournament_id=$1 ORDER BY id",
              [id],
            )
          ).rows;
          if (!groups.length)
            throw new HttpError(409, "Crea al menos un grupo");
          await invalidate(c, id);
          let count = 0;
          for (const group of groups) {
            const participants = entries
              .filter((e) => e.group_id === group.id)
              .map((e) => e.id);
            if (participants.length < 2 || participants.length > group.capacity)
              throw new HttpError(
                409,
                "Cada grupo necesita entre 2 jugadores y su capacidad máxima",
              );
            for (const round of roundRobin(participants)) {
              const when = roundDate(
                t.start_date.toISOString().slice(0, 10),
                round.number,
                t.interval_days,
              );
              if (when > t.deadline.toISOString().slice(0, 10))
                throw new HttpError(
                  409,
                  "El calendario excede la fecha límite del torneo",
                );
              for (const [a, b] of round.pairs) {
                await c.query(
                  "INSERT INTO app_games(tournament_id,group_id,round_number,proposed_date,player_a,player_b) VALUES($1,$2,$3,$4,$5,$6)",
                  [id, group.id, round.number, when, a, b],
                );
                count++;
              }
            }
          }
          return count;
        });
        return reply({ count });
      }
      if (action === "publish") {
        await transaction(async (c) => {
          const t = await lockedTournament(c, id);
          const games = (
            await c.query(
              "SELECT count(*)::integer AS count FROM app_games WHERE tournament_id=$1",
              [id],
            )
          ).rows[0].count;
          if (!games)
            throw new HttpError(409, "Genera los cruces antes de publicar");
          const entries = (
            await c.query(
              "SELECT e.*,u.name,g.name AS group_name FROM app_entries e JOIN app_users u ON u.id=e.user_id JOIN app_groups g ON g.id=e.group_id WHERE e.tournament_id=$1 AND e.active",
              [id],
            )
          ).rows;
          await c.query(
            "UPDATE app_tournaments SET state='published' WHERE id=$1",
            [id],
          );
          await c.query(
            "UPDATE app_invites SET revoked=true WHERE tournament_id=$1",
            [id],
          );
          for (const e of entries) {
            const message =
              "Ya está publicado " +
              t.name +
              ". Tu grupo: " +
              e.group_name +
              ". Consulta tus cruces y las fechas propuestas en tu área de jugador.";
            await c.query(
              "INSERT INTO app_notices(user_id,tournament_id,message) VALUES($1,$2,$3)",
              [e.user_id, id, message],
            );
            const schedule = (
              await c.query(
                `SELECT g.round_number,g.proposed_date,CASE WHEN g.player_a=$2 THEN ub.name ELSE ua.name END AS rival FROM app_games g JOIN app_entries a ON a.id=g.player_a JOIN app_users ua ON ua.id=a.user_id JOIN app_entries b ON b.id=g.player_b JOIN app_users ub ON ub.id=b.user_id WHERE g.tournament_id=$1 AND (g.player_a=$2 OR g.player_b=$2) ORDER BY g.round_number`,
                [id, e.id],
              )
            ).rows;
            const lines = schedule
              .map(
                (m) =>
                  "Jornada " +
                  m.round_number +
                  " · " +
                  m.proposed_date.toISOString().slice(0, 10) +
                  " · " +
                  m.rival,
              )
              .join("\n");
            await c.query(
              "INSERT INTO app_mail(user_id,tournament_id,subject,body) VALUES($1,$2,$3,$4)",
              [
                e.user_id,
                id,
                "Tu grupo y calendario · " + t.name,
                message +
                  "\n\n" +
                  lines +
                  "\n\n" +
                  (process.env.APP_URL || new URL(request.url).origin) +
                  "/jugador?torneo=" +
                  id,
              ],
            );
          }
        });
        return reply({ ok: true, mail: await deliverMail(id) });
      }
      if (action === "retry-mail") {
        await lockedTournamentForMail(id);
        return reply({ mail: await deliverMail(id) });
      }
    }
    throw new HttpError(404, "Operación no encontrada");
  } catch (error) {
    if (error instanceof HttpError)
      return reply({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return reply(
        { error: error.issues.map((i) => i.message).join(". ") },
        400,
      );
    if (error instanceof SyntaxError)
      return reply({ error: "Solicitud inválida" }, 400);
    if ((error as { code?: string }).code === "23505")
      return reply({ error: "El registro ya existe" }, 409);
    console.error(
      "Club request failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return reply({ error: "No se pudo completar la operación" }, 500);
  }
}
async function lockedTournamentForMail(id: string) {
  const t = (
    await database().query("SELECT state FROM app_tournaments WHERE id=$1", [
      id,
    ])
  ).rows[0];
  if (!t) throw new HttpError(404, "Torneo no encontrado");
  if (t.state !== "published")
    throw new HttpError(409, "Publica el torneo antes de enviar avisos");
}
