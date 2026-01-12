import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eliwell EWCM EO - Simulador Digital",
  description: "Digital Twin del controlador Eliwell EWCM EO para centrales frigoríficas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
