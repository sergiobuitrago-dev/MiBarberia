import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiBarbería",
  description: "Gestión sencilla para tu barbería.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-CO"><body>{children}</body></html>;
}
