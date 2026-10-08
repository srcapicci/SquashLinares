"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/client";
export default function FirstRun() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    api<{ available: boolean }>("setup")
      .then((d) => setAvailable(d.available))
      .catch(() => {});
  }, []);
  return available ? (
    <aside>
      <strong>Tu club está listo para empezar.</strong>
      <p>Crea tu cuenta administradora en el primer acceso.</p>
      <a className="button primary" href="/configurar">
        Configurar mi club →
      </a>
    </aside>
  ) : null;
}
