import Shell from "./components/shell";
export default function Home() {
  return (
    <Shell>
      <header>
        <span className="eyebrow">CLUB DE SQUASH LINARES</span>
        <h1>
          Más juego.
          <br />
          <em>Menos complicaciones.</em>
        </h1>
        <p>Tus torneos, tu grupo y cada partido en un mismo lugar.</p>
        <div className="actions">
          <a className="button primary" href="/acceso">
            Entrar a mi cuenta →
          </a>
          <a className="button" href="/archivo">
            Ver calendario del pretorneo
          </a>
        </div>
      </header>
      <section className="feature-grid">
        <article className="panel">
          <span className="eyebrow">01 · INSCRIPCIÓN</span>
          <h2>Un enlace. Estás dentro.</h2>
          <p>
            Inscríbete desde el enlace temporal que comparte la organización.
            Crea tu cuenta y marca si eres socio del club.
          </p>
        </article>
        <article className="panel">
          <span className="eyebrow">02 · TUS PARTIDOS</span>
          <h2>Tu próximo rival.</h2>
          <p>
            Consulta tu grupo, tus cruces y las fechas orientativas de cada
            jornada desde el móvil.
          </p>
        </article>
        <article className="panel">
          <span className="eyebrow">03 · AL DÍA</span>
          <h2>El resultado cuenta.</h2>
          <p>
            Registra tus partidos y recibe avisos en la app y por correo cuando
            se publique el calendario.
          </p>
        </article>
      </section>
      <p className="footnote">
        ¿Todavía no tienes cuenta? Pide el enlace de inscripción del torneo a la
        organización. Puedes añadir esta web a la pantalla de inicio de tu
        móvil.
      </p>
    </Shell>
  );
}
