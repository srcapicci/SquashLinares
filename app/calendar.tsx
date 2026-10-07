"use client";
import { useState } from "react";
type Tournament = {
  name: string;
  deadline: string;
  groups: {
    id: number;
    players: string[];
    rounds: {
      number: number;
      week: string;
      rest: string | null;
      matches: { id: string; players: string[] }[];
    }[];
  }[];
};
export default function Calendar({ tournament }: { tournament: Tournament }) {
  const [groupId, setGroupId] = useState(1);
  const [player, setPlayer] = useState("");
  const group = tournament.groups.find((g) => g.id === groupId)!;
  const rounds = group.rounds.filter(
    (r) =>
      !player ||
      r.matches.some((m) => m.players.includes(player)) ||
      r.rest === player,
  );
  return (
    <main>
      <nav>
        <a className="brand" href="/">
          ◉{" "}
          <span>
            SQUASH <b>LINARES</b>
          </span>
        </a>
        <span className="season">TEMPORADA 26 / 27</span>
      </nav>
      <header>
        <span className="eyebrow">CLUB DE SQUASH LINARES · PRETORNEO</span>
        <h1>
          Tu liga.
          <br />
          <em>Todos tus partidos.</em>
        </h1>
        <p>
          Encuentra tu grupo, consulta tus rivales y organiza la próxima
          jornada.
        </p>
        <div className="stats">
          <span>
            <b>25</b> jugadores
          </span>
          <span>
            <b>3</b> grupos
          </span>
          <span>
            <b>19 OCT</b> inicio
          </span>
          <span>
            <b>30 DIC</b> límite de recuperación
          </span>
        </div>
      </header>
      <section className="workspace">
        <div className="section-head">
          <div>
            <span className="eyebrow">CALENDARIO 2026</span>
            <h2>La pista te espera</h2>
          </div>
          <span className="badge">Resultados pendientes de habilitar</span>
        </div>
        <div className="filters">
          <div className="tabs" role="group" aria-label="Seleccionar grupo">
            {tournament.groups.map((g) => (
              <button
                key={g.id}
                className={g.id === groupId ? "active" : ""}
                onClick={() => {
                  setGroupId(g.id);
                  setPlayer("");
                }}
              >
                Grupo {g.id}
                <small>{g.players.length} jugadores</small>
              </button>
            ))}
          </div>
          <label>
            Ver partidos de
            <select value={player} onChange={(e) => setPlayer(e.target.value)}>
              <option value="">Todos los jugadores</option>
              {group.players.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        {groupId === 3 && (
          <aside role="note">
            <strong>Calendario pendiente de revisión.</strong> El PDF contiene
            dos cruces repetidos y dos ausentes en este grupo. Se muestran los
            partidos originales hasta que la organización confirme la
            corrección.
          </aside>
        )}
        <div className="rounds">
          {rounds.map((r) => (
            <article className="round" key={r.number}>
              <div className="round-head">
                <h3>Jornada {String(r.number).padStart(2, "0")}</h3>
                <time dateTime={r.week}>
                  Semana del{" "}
                  {new Date(r.week + "T12:00:00").toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                  })}
                </time>
              </div>
              {r.matches
                .filter((m) => !player || m.players.includes(player))
                .map((m) => (
                  <div className="match" key={m.id}>
                    <div>
                      <span>{m.players[0]}</span>
                      <span>{m.players[1]}</span>
                    </div>
                    <span className="pending">Por jugar</span>
                  </div>
                ))}
              {r.rest && (!player || player === r.rest) && (
                <p className="rest">Descansa: {r.rest}</p>
              )}
            </article>
          ))}
        </div>
        <p className="footnote">
          Fuente: calendario facilitado por el club. Las semanas indican la
          jornada; no son fechas límite individuales. Partidos aplazados hasta
          el 30 de diciembre de 2026.
        </p>
      </section>
      <section className="rules">
        <h2>El camino a la liga</h2>
        <div>
          {[
            ["01 — PRIMERA", "Puestos 1.º, 2.º y 3.º"],
            ["02 — SEGUNDA", "Puestos 4.º, 5.º y 6.º"],
            ["03 — TERCERA", "Puestos 7.º, 8.º y 9.º"],
          ].map(([t, s]) => (
            <article key={t}>
              <h3>{t}</h3>
              <p>{s} de cada grupo</p>
            </article>
          ))}
        </div>
        <p>
          La puntuación y los desempates están pendientes de confirmación.
          Todavía no se calcula una clasificación.
        </p>
      </section>
      <footer>
        CLUB DE SQUASH LINARES <span>Hecho para disfrutar del juego.</span>
      </footer>
    </main>
  );
}
