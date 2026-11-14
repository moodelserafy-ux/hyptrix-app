import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyptrix — Your Cinema Universe",
  description: "Build a cinema empire, create films and series, and shape your own cinematic universe.",
  applicationName: "Hyptrix",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Hyptrix" },
};
export const viewport: Viewport = { themeColor: "#f5f6ff", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
