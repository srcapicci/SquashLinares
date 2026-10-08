"use client";
import { useEffect, useState } from "react";
import { api, type User } from "../../lib/client";
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ user: User | null }>("session")
      .then((d) => setUser(d.user))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return { user, loading, error };
}
export default function Shell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: User | null;
}) {
  return (
    <main className="club-shell">
      <nav>
        <a className="brand" href="/">
          ◉{" "}
          <span>
            SQUASH <b>LINARES</b>
          </span>
        </a>
        <div className="nav-links">
          {user ? (
            <>
              <a href={user.role === "admin" ? "/admin" : "/jugador"}>
                {user.role === "admin" ? "Administración" : "Mis partidos"}
              </a>
              <a href="/avisos">Avisos</a>
              <button
                onClick={async () => {
                  try {
                    await api("auth/logout", {});
                    window.location.assign("/");
                  } catch {
                    window.alert(
                      "No se pudo cerrar la sesión. Vuelve a intentarlo.",
                    );
                  }
                }}
              >
                Salir
              </button>
            </>
          ) : (
            <a href="/acceso">Entrar</a>
          )}
        </div>
      </nav>
      {children}
      <footer>
        CLUB DE SQUASH LINARES<span>Tu club. Tu juego.</span>
      </footer>
    </main>
  );
}
export function AccessState({
  loading,
  error,
  user,
  admin = false,
}: {
  loading: boolean;
  error: string;
  user: User | null;
  admin?: boolean;
}) {
  if (loading) return <p role="status">Cargando…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!user)
    return (
      <section className="panel">
        <h1>Tu espacio en la liga</h1>
        <p>Entra con tu cuenta para continuar.</p>
        <a className="button primary" href="/acceso">
          Iniciar sesión
        </a>
      </section>
    );
  if (admin && user.role !== "admin")
    return (
      <p role="alert">
        Esta sección es para administradores.{" "}
        <a href="/jugador">Ir a mis partidos</a>
      </p>
    );
  return null;
}
