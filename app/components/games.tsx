"use client";
import { useState } from "react";
import { api, day, type Game, type Group } from "../../lib/client";
export default function Games({
  games,
  groups,
  target,
  admin = false,
  onChange,
}: {
  games: Game[];
  groups: Group[];
  target: number;
  admin?: boolean;
  onChange: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!games.length)
    return (
      <p className="footnote">El calendario todavía no está disponible.</p>
    );
  return (
    <>
      <div className="rounds">
        {games.map((g) => (
          <article className="round" key={g.id}>
            <div className="round-head">
              <h3>
                Jornada {g.round_number} ·{" "}
                {groups.find((x) => x.id === g.group_id)?.name}
              </h3>
              <time>{day(g.proposed_date)}</time>
            </div>
            <div className="match">
              <div>
                <span>
                  {g.name_a} {g.score_a !== null && <b> · {g.score_a}</b>}
                </span>
                <span>
                  {g.name_b} {g.score_b !== null && <b> · {g.score_b}</b>}
                </span>
              </div>
              <span className="pending">
                {g.completed_at ? "Finalizado" : "Por jugar"}
              </span>
            </div>
            {(!g.completed_at || admin) && (
              <details className="result-form">
                <summary>
                  {g.completed_at ? "Corregir resultado" : "Anotar resultado"}
                </summary>
                <p>
                  Gana quien llegue a {target} juegos. El resultado finalizará
                  el partido.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    const f = new FormData(e.currentTarget);
                    try {
                      await api("games/" + g.id + "/result", {
                        score_a: Number(f.get("score_a")),
                        score_b: Number(f.get("score_b")),
                      });
                      onChange();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Juegos de {g.name_a}
                    <input
                      name="score_a"
                      type="number"
                      min={0}
                      max={target}
                      defaultValue={g.score_a ?? 0}
                      required
                    />
                  </label>
                  <label>
                    Juegos de {g.name_b}
                    <input
                      name="score_b"
                      type="number"
                      min={0}
                      max={target}
                      defaultValue={g.score_b ?? 0}
                      required
                    />
                  </label>
                  <button disabled={busy} className="primary">
                    Guardar resultado
                  </button>
                </form>
              </details>
            )}
          </article>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
