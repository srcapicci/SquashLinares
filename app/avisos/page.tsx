"use client";
import { useEffect, useState } from "react";
import Shell, { useUser, AccessState } from "../components/shell";
import { api, type Notice } from "../../lib/client";
export default function Notices() {
  const auth = useUser();
  const [notices, setNotices] = useState<Notice[]>([]),
    [error, setError] = useState("");
  async function load() {
    try {
      setNotices((await api<{ notices: Notice[] }>("notices")).notices);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (auth.user) void load();
  }, [auth.user]);
  return (
    <Shell user={auth.user}>
      <AccessState {...auth} />
      {auth.user && (
        <>
          <header className="compact">
            <span className="eyebrow">AL DÍA CON TU LIGA</span>
            <h1>Tus avisos.</h1>
            <p>{notices.filter((n) => !n.read_at).length} sin leer</p>
          </header>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!notices.length && <p>No tienes avisos todavía.</p>}
          {notices.map((n) => (
            <article className="panel notice" key={n.id}>
              <span className="badge">{n.read_at ? "Leído" : "Nuevo"}</span>
              <p>{n.message}</p>
              <div className="actions">
                <a href={"/jugador?torneo=" + n.tournament_id}>Ver torneo →</a>
                {!n.read_at && (
                  <button
                    onClick={async () => {
                      try {
                        await api("notices/" + n.id + "/read", {});
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Marcar como leído
                  </button>
                )}
              </div>
            </article>
          ))}
        </>
      )}
    </Shell>
  );
}
