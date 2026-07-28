import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONE — Todo tu negocio en un solo lugar",
  description: "Plataforma comercial ONE",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
