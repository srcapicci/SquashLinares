import type { Metadata } from "next";
import "./globals.css";
import Install from "./components/install";
export const metadata: Metadata = {
  title: "Club de Squash Linares",
  description: "Grupos, jornadas y partidos del Club de Squash Linares",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Install />
        {children}
      </body>
    </html>
  );
}
