"use client";
import { useEffect, useState } from "react";
import Shell from "../components/shell";
import { api } from "../../lib/client";
export default function Setup() {
  const [available, setAvailable] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ available: boolean }>("setup")
      .then((d) => setAvailable(d.available))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Shell>
      <section className="auth-panel panel">
        <span className="eyebrow">BIENVENIDO AL CLUB</span>
        <h1>Vamos a empezar.</h1>
        {loading ? (
          <p role="status">Comprobando el primer acceso…</p>
        ) : available ? (
          <>
            <p>
              Crea tu cuenta administradora para gestionar los torneos. Esta
              configuración solo se realiza una vez.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const f = new FormData(e.currentTarget);
                try {
                  await api("setup", {
                    name: f.get("name"),
                    email: f.get("email"),
                    password: f.get("password"),
                  });
                  window.location.assign("/admin");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Nombre y apellidos
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={120}
                  required
                />
              </label>
              <label>
                Correo electrónico
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <p className="footnote">
                Al menos 12 caracteres. No hay ninguna contraseña
                predeterminada.
              </p>
              <button className="primary" disabled={busy}>
                {busy ? "Creando cuenta…" : "Crear mi cuenta y entrar"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p>
              La configuración inicial está cerrada. Entra con tu cuenta para
              continuar.
            </p>
            <a className="button primary" href="/acceso">
              Iniciar sesión
            </a>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </Shell>
  );
}
