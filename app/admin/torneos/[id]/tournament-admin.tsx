"use client";
import { useCallback, useEffect, useState } from "react";
import Shell, { useUser, AccessState } from "../../../components/shell";
import Games from "../../../components/games";
import { api, day, type Detail, type Entry } from "../../../../lib/client";
export default function TournamentAdmin({ id }: { id: string }) {
  const auth = useUser();
  const [data, setData] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(
    () =>
      api<Detail>("tournaments/" + id)
        .then(setData)
        .catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    if (auth.user?.role === "admin") void load();
  }, [auth.user, load]);
  async function action(path: string, body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{
        url?: string;
        count?: number;
        mail?: { sent: number; failed: number };
      }>("tournaments/" + id + "/" + path, body);
      if (result.url) setLink(result.url);
      if (path === "publish" || path === "close-registration") setLink("");
      setMessage(
        result.mail
          ? `Correos enviados: ${result.mail.sent}. Pendientes de reintento: ${result.mail.failed}.`
          : result.count !== undefined
            ? `${result.count} cruces generados. Revisa el calendario antes de publicar.`
            : "Cambios guardados.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(e: Entry, changes: Partial<Entry>) {
    return action("entries/" + e.id, {
      group_id: e.group_id,
      is_member: e.is_member,
      active: e.active,
      ...changes,
    });
  }
  return (
    <Shell user={auth.user}>
      <AccessState {...auth} admin />
      {auth.user?.role === "admin" && (
        <>
          <a className="back-link" href="/admin">
            ← Todos los torneos
          </a>
          {data ? (
            <>
              <header className="compact">
                <span className="eyebrow">
                  {data.tournament.state === "draft"
                    ? "EN PREPARACIÓN"
                    : "CALENDARIO PUBLICADO"}
                </span>
                <h1>{data.tournament.name}</h1>
                <p>
                  {day(data.tournament.start_date)} · Una jornada cada{" "}
                  {data.tournament.interval_days} días · Recuperaciones hasta{" "}
                  {day(data.tournament.deadline)}
                </p>
              </header>
              {data.tournament.state === "draft" && (
                <details className="panel">
                  <summary>Editar datos y fechas del torneo</summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void action("settings", {
                        name: f.get("name"),
                        start_date: f.get("start_date"),
                        deadline: f.get("deadline"),
                        interval_days: Number(f.get("interval_days")),
                        games_to_win: Number(f.get("games_to_win")),
                      });
                    }}
                  >
                    <label>
                      Nombre
                      <input
                        name="name"
                        defaultValue={data.tournament.name}
                        required
                      />
                    </label>
                    <label>
                      Inicio
                      <input
                        type="date"
                        name="start_date"
                        defaultValue={data.tournament.start_date.slice(0, 10)}
                        required
                      />
                    </label>
                    <label>
                      Fecha límite
                      <input
                        type="date"
                        name="deadline"
                        defaultValue={data.tournament.deadline.slice(0, 10)}
                        required
                      />
                    </label>
                    <label>
                      Días entre jornadas
                      <input
                        type="number"
                        name="interval_days"
                        min={1}
                        max={365}
                        defaultValue={data.tournament.interval_days}
                        required
                      />
                    </label>
                    <label>
                      Juegos para ganar
                      <input
                        type="number"
                        name="games_to_win"
                        min={1}
                        max={5}
                        defaultValue={data.tournament.games_to_win}
                        required
                      />
                    </label>
                    <button className="primary" disabled={busy}>
                      Guardar y regenerar después los cruces
                    </button>
                  </form>
                </details>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="success" role="status">
                  {message}
                </p>
              )}
              {data.tournament.state === "draft" && (
                <section className="panel">
                  <h2>1. Abre las inscripciones</h2>
                  <p>
                    El enlace permite inscribirse sin iniciar sesión. Cada
                    jugador crea su cuenta al registrarse.
                  </p>
                  {data.invite && (
                    <p className="footnote">
                      {data.invite.revoked
                        ? "Inscripción cerrada"
                        : "Caducidad del último enlace: " +
                          new Date(data.invite.expires_at).toLocaleString(
                            "es-ES",
                            { timeZone: "Europe/Madrid" },
                          )}
                    </p>
                  )}
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void action("invite", {
                        expires_at: new Date(
                          String(f.get("expires_at")),
                        ).toISOString(),
                      });
                    }}
                  >
                    <label>
                      Caducidad (hora de este dispositivo)
                      <input type="datetime-local" name="expires_at" required />
                    </label>
                    <button className="primary" disabled={busy}>
                      Generar enlace
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void action("close-registration", {})}
                    >
                      Cerrar inscripción
                    </button>
                  </form>
                  <p className="footnote">
                    Generar otro enlace invalida el anterior. Publicar el
                    calendario también cierra las inscripciones.
                  </p>
                  {link && (
                    <div className="share-box">
                      <label>
                        Enlace para compartir
                        <input
                          readOnly
                          value={link}
                          onFocus={(e) => e.target.select()}
                        />
                      </label>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(link);
                            setMessage("Enlace copiado.");
                          } catch {
                            setMessage("Selecciona el enlace para copiarlo.");
                          }
                        }}
                      >
                        Copiar enlace
                      </button>
                    </div>
                  )}
                </section>
              )}
              <section className="panel">
                <h2>2. Jugadores y grupos</h2>
                <p>
                  {data.entries.filter((e) => e.active).length} jugadores
                  activos · {data.groups.length} grupos
                </p>
                {data.tournament.state === "draft" && (
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void action("groups", {
                        name: f.get("name"),
                        capacity: Number(f.get("capacity")),
                      });
                    }}
                  >
                    <label>
                      Nombre del grupo
                      <input name="name" required maxLength={120} />
                    </label>
                    <label>
                      Capacidad máxima
                      <input
                        name="capacity"
                        type="number"
                        min={2}
                        max={100}
                        defaultValue={8}
                        required
                      />
                    </label>
                    <button disabled={busy} className="primary">
                      Crear grupo
                    </button>
                  </form>
                )}
                <div className="group-summary">
                  {data.groups.map((g) => (
                    <span className="badge" key={g.id}>
                      {g.name}:{" "}
                      {
                        data.entries.filter(
                          (e) => e.active && e.group_id === g.id,
                        ).length
                      }
                      /{g.capacity}
                    </span>
                  ))}
                </div>
                {data.tournament.state === "draft" && (
                  <div className="actions">
                    {data.groups
                      .filter(
                        (g) => !data.entries.some((e) => e.group_id === g.id),
                      )
                      .map((g) => (
                        <button
                          key={g.id}
                          disabled={busy}
                          onClick={() =>
                            void action("groups/" + g.id + "/remove", {})
                          }
                        >
                          Eliminar {g.name} (vacío)
                        </button>
                      ))}
                  </div>
                )}
                {!data.entries.length ? (
                  <p className="footnote">Las inscripciones aparecerán aquí.</p>
                ) : (
                  <div className="entries">
                    {data.entries.map((e) => (
                      <article className="entry" key={e.id}>
                        <div>
                          <b>{e.name}</b>
                          <small>{e.email}</small>
                        </div>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={e.is_member ?? false}
                            disabled={busy}
                            onChange={(x) =>
                              void edit(e, { is_member: x.target.checked })
                            }
                          />{" "}
                          Socio
                        </label>
                        <label>
                          Grupo
                          <select
                            value={e.group_id ?? ""}
                            disabled={
                              busy ||
                              !e.active ||
                              data.tournament.state !== "draft"
                            }
                            onChange={(x) =>
                              void edit(e, { group_id: x.target.value || null })
                            }
                          >
                            <option value="">Sin asignar</option>
                            {data.groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={e.active ?? false}
                            disabled={busy || data.tournament.state !== "draft"}
                            onChange={(x) =>
                              void edit(e, { active: x.target.checked })
                            }
                          />{" "}
                          Activo
                        </label>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className="panel">
                <div className="section-head">
                  <div>
                    <h2>3. Cuadro de juego</h2>
                    <p>
                      Todos contra todos a una vuelta. Las fechas son
                      orientativas.
                    </p>
                  </div>
                  {data.tournament.state === "draft" && (
                    <div className="actions">
                      <button
                        disabled={busy}
                        onClick={() => void action("generate", {})}
                      >
                        Generar cruces
                      </button>
                      <button
                        className="primary"
                        disabled={busy || !data.games.length}
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Publicar el calendario y avisar a todos los jugadores? Se cerrará la inscripción y se fijarán los grupos.",
                            )
                          )
                            void action("publish", {});
                        }}
                      >
                        Publicar y avisar
                      </button>
                    </div>
                  )}
                </div>
                {data.tournament.state === "draft" ? (
                  <>
                    <p className="footnote">
                      Cambiar participantes o grupos elimina los cruces
                      provisionales; deberás generarlos de nuevo.
                    </p>
                    <div className="rounds">
                      {data.games.map((g) => (
                        <article className="round" key={g.id}>
                          <div className="round-head">
                            <h3>
                              {
                                data.groups.find((x) => x.id === g.group_id)
                                  ?.name
                              }{" "}
                              · Jornada {g.round_number}
                            </h3>
                            <time>{day(g.proposed_date)}</time>
                          </div>
                          <div className="match">
                            <div>
                              <span>{g.name_a}</span>
                              <span>{g.name_b}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="footnote">
                      Correo: {data.mail?.sent ?? 0} enviados ·{" "}
                      {data.mail?.pending ?? 0} pendientes.
                    </p>
                    {!!data.mail?.pending && (
                      <button
                        disabled={busy}
                        onClick={() => void action("retry-mail", {})}
                      >
                        Reintentar correos pendientes
                      </button>
                    )}
                    <Games
                      games={data.games}
                      groups={data.groups}
                      target={data.tournament.games_to_win}
                      admin
                      onChange={() => void load()}
                    />
                  </>
                )}
              </section>
            </>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <p role="status">Cargando torneo…</p>
          )}
        </>
      )}
    </Shell>
  );
}
