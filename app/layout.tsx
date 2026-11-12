import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyptrix — Build Your Cinema Empire",
  description: "A hardcore cinema and TV production tycoon simulation.",
  applicationName: "Hyptrix",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Hyptrix" },
};
export const viewport: Viewport = { themeColor: "#0A0A0C", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
