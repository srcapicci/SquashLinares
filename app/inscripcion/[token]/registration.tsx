"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/shell";
import { api, day } from "../../../lib/client";
type Invite = {
  name: string;
  start_date: string;
  deadline: string;
  expires_at: string;
};
export default function Registration({ token }: { token: string }) {
  const [t, setT] = useState<Invite | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ tournament: Invite }>("invites/" + token)
      .then((d) => setT(d.tournament))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  return (
    <Shell>
      <section className="auth-panel panel">
        <span className="eyebrow">INSCRIPCIÓN AL TORNEO</span>
        <h1>{t?.name || "Tu próxima liga."}</h1>
        {loading ? (
          <p role="status">Comprobando inscripción…</p>
        ) : t ? (
          <>
            <p>
              Inicio: {day(t.start_date)} · Límite de recuperación:{" "}
              {day(t.deadline)}
            </p>
            <aside>
              Inscripción abierta hasta{" "}
              {new Date(t.expires_at).toLocaleString("es-ES", {
                timeZone: "Europe/Madrid",
              })}{" "}
              (hora de Madrid).
            </aside>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const f = new FormData(e.currentTarget);
                try {
                  await api("invites/" + token, {
                    name: f.get("name"),
                    email: f.get("email"),
                    password: f.get("password"),
                    is_member: f.get("is_member") === "on",
                  });
                  window.location.assign("/jugador");
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
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
              <label>
                Contraseña para acceder a tus partidos
                <input
                  type="password"
                  name="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
              <p className="footnote">
                Mínimo 12 caracteres. Si ya tienes cuenta de otro torneo,
                utiliza el mismo correo y contraseña.
              </p>
              <label className="check">
                <input type="checkbox" name="is_member" /> Soy socio del club
              </label>
              <p className="footnote">
                Tu nombre será visible para los participantes de tu grupo. La
                organización utiliza tu correo para los avisos del torneo. La
                condición de socio se revisa en administración.
              </p>
              <button disabled={busy} className="primary">
                {busy ? "Registrando…" : "Inscribirme →"}
              </button>
            </form>
          </>
        ) : (
          <p>Solicita un nuevo enlace a la organización.</p>
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
