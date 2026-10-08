"use client";
import { useEffect, useState } from "react";
import Shell, { useUser, AccessState } from "../components/shell";
import { api, day, type Tournament, type User } from "../../lib/client";
export default function Admin() {
  const auth = useUser();
  const [list, setList] = useState<Tournament[]>([]),
    [admins, setAdmins] = useState<User[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (auth.user?.role === "admin") {
      api<{ tournaments: Tournament[] }>("tournaments")
        .then((d) => setList(d.tournaments))
        .catch((e) => setError(e.message));
      api<{ admins: User[] }>("admins")
        .then((d) => setAdmins(d.admins))
        .catch((e) => setError(e.message));
    }
  }, [auth.user]);
  async function action(
    e: React.FormEvent<HTMLFormElement>,
    path: string,
    make: (f: FormData) => unknown,
  ) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget;
    try {
      const d = await api<{ tournament?: Tournament }>(
        path,
        make(new FormData(form)),
      );
      if (d.tournament)
        window.location.assign("/admin/torneos/" + d.tournament.id);
      else {
        form.reset();
        setAdmins((await api<{ admins: User[] }>("admins")).admins);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell user={auth.user}>
      <AccessState {...auth} admin />
      {auth.user?.role === "admin" && (
        <>
          <header className="compact">
            <span className="eyebrow">ADMINISTRACIÓN DEL CLUB</span>
            <h1>
              Cada torneo,
              <br />
              <em>a tu manera.</em>
            </h1>
            <p>
              Inscripciones, jugadores, grupos y calendario desde un mismo
              espacio.
            </p>
          </header>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-grid">
            <section>
              <h2>Torneos</h2>
              {!list.length && (
                <div className="panel">
                  <p>
                    Todavía no hay torneos. Crea el primero para abrir las
                    inscripciones.
                  </p>
                </div>
              )}
              {list.map((t) => (
                <a
                  className="panel tournament-card"
                  key={t.id}
                  href={"/admin/torneos/" + t.id}
                >
                  <span className="badge">
                    {t.state === "draft" ? "En preparación" : "Publicado"}
                  </span>
                  <h3>{t.name}</h3>
                  <p>
                    {day(t.start_date)} → {day(t.deadline)}
                  </p>
                  <span>Gestionar torneo →</span>
                </a>
              ))}
            </section>
            <section className="panel">
              <h2>Crear torneo</h2>
              <form
                onSubmit={(e) =>
                  action(e, "tournaments", (f) => ({
                    name: f.get("name"),
                    start_date: f.get("start_date"),
                    deadline: f.get("deadline"),
                    interval_days: Number(f.get("interval_days")),
                    games_to_win: Number(f.get("games_to_win")),
                  }))
                }
              >
                <label>
                  Nombre del torneo
                  <input name="name" required maxLength={120} />
                </label>
                <label>
                  Fecha orientativa de la primera jornada
                  <input type="date" name="start_date" required />
                </label>
                <label>
                  Fecha límite para recuperar partidos
                  <input type="date" name="deadline" required />
                </label>
                <label>
                  Días entre jornadas
                  <input
                    type="number"
                    name="interval_days"
                    min={1}
                    max={365}
                    defaultValue={7}
                    required
                  />
                </label>
                <label>
                  Juegos necesarios para ganar
                  <input
                    type="number"
                    name="games_to_win"
                    min={1}
                    max={5}
                    defaultValue={3}
                    required
                  />
                </label>
                <button className="primary" disabled={busy}>
                  Crear torneo
                </button>
              </form>
            </section>
          </div>
          <section className="panel admin-accounts">
            <h2>Administradores</h2>
            <p>
              Todos los administradores pueden gestionar los torneos del club.
            </p>
            <ul>
              {admins.map((a) => (
                <li key={a.id}>
                  {a.name} · {a.email}
                </li>
              ))}
            </ul>
            <details>
              <summary>Añadir administrador</summary>
              <form
                onSubmit={(e) =>
                  action(e, "admins", (f) => ({
                    name: f.get("name"),
                    email: f.get("email"),
                    password: f.get("password"),
                  }))
                }
              >
                <label>
                  Nombre
                  <input name="name" required maxLength={120} />
                </label>
                <label>
                  Correo
                  <input type="email" name="email" required />
                </label>
                <label>
                  Contraseña inicial
                  <input
                    name="password"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <button disabled={busy} className="primary">
                  Crear administrador
                </button>
              </form>
            </details>
          </section>
        </>
      )}
    </Shell>
  );
}
