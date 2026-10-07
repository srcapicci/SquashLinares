import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Squash Linares · Liga 26–27",
  description: "Grupos, jornadas y partidos del Club de Squash Linares",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
