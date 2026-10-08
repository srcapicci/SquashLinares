"use client";
import { useCallback, useEffect, useState } from "react";
import Shell, { useUser, AccessState } from "../components/shell";
import Games from "../components/games";
import { api, day, type Tournament, type Detail } from "../../lib/client";
export default function Player() {
  const auth = useUser();
  const [list, setList] = useState<Tournament[]>([]),
    [id, setId] = useState(""),
    [data, setData] = useState<Detail | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (auth.user)
      api<{ tournaments: Tournament[] }>("tournaments")
        .then((d) => {
          setList(d.tournaments);
          const query = new URLSearchParams(window.location.search).get(
            "torneo",
          );
          setId(
            d.tournaments.find((t) => t.id === query)?.id ??
              d.tournaments[0]?.id ??
              "",
          );
        })
        .catch((e) => setError(e.message));
  }, [auth.user]);
  const load = useCallback(() => {
    if (id)
      return api<Detail>("tournaments/" + id)
        .then(setData)
        .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    setData(null);
    void load();
  }, [load]);
  const group = data?.groups.find((g) => g.id === data.myEntry?.group_id);
  const rests =
    data && data.tournament.state === "published" && group
      ? Array.from(
          {
            length:
              data.entries.length % 2
                ? data.entries.length
                : data.entries.length - 1,
          },
          (_, i) => i + 1,
        ).filter((n) => !data.games.some((g) => g.round_number === n))
      : [];
  return (
    <Shell user={auth.user}>
      <AccessState {...auth} />
      {auth.user && (
        <>
          <header className="compact">
            <span className="eyebrow">TU ESPACIO EN LA LIGA</span>
            <h1>
              Hola, <em>{auth.user.name.split(" ")[0]}.</em>
            </h1>
            <p>Tu próximo partido empieza aquí.</p>
          </header>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {list.length ? (
            <label className="tournament-picker">
              Mi torneo
              <select value={id} onChange={(e) => setId(e.target.value)}>
                {list.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <section className="panel">
              <p>
                Todavía no estás inscrito en un torneo. Solicita el enlace de
                inscripción a la organización.
              </p>
            </section>
          )}
          {data && (
            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">{data.tournament.name}</span>
                  <h2>{group?.name || "Inscripción registrada"}</h2>
                </div>
                <span className="badge">
                  {data.tournament.state === "published"
                    ? "Calendario publicado"
                    : "Esperando al calendario"}
                </span>
              </div>
              {data.tournament.state === "draft" ? (
                <p>
                  La organización está preparando los grupos. Te avisaremos en
                  la app y por correo cuando se publique el calendario.
                </p>
              ) : (
                <>
                  <p>
                    Fecha límite de recuperación:{" "}
                    {day(data.tournament.deadline)}. Las fechas de cada partido
                    son orientativas.
                  </p>
                  <details>
                    <summary>Jugadores de mi grupo</summary>
                    <ul>
                      {data.entries.map((e) => (
                        <li key={e.id}>{e.name}</li>
                      ))}
                    </ul>
                  </details>
                  {rests.length > 0 && (
                    <p className="footnote">
                      Descansas en{" "}
                      {rests.map((n) => "la jornada " + n).join(", ")}.
                    </p>
                  )}
                  <Games
                    games={data.games}
                    groups={data.groups}
                    target={data.tournament.games_to_win}
                    onChange={() => void load()}
                  />
                </>
              )}
            </section>
          )}
        </>
      )}
    </Shell>
  );
}
