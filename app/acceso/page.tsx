"use client";
import { useState } from "react";
import Shell from "../components/shell";
import { api, type User } from "../../lib/client";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell>
      <section className="auth-panel panel">
        <span className="eyebrow">BIENVENIDO A LA PISTA</span>
        <h1>Tu cuenta.</h1>
        <p>Entra para ver tus partidos y avisos.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const { user } = await api<{ user: User }>("auth/login", {
                email: f.get("email"),
                password: f.get("password"),
              });
              window.location.assign(
                user.role === "admin" ? "/admin" : "/jugador",
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Correo electrónico
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="footnote">
          Para crear una cuenta, utiliza el enlace de inscripción de tu torneo.
          Si no recuerdas tu contraseña, contacta con la organización.
        </p>
      </section>
    </Shell>
  );
}
