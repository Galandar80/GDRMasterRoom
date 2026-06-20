import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GDR Master Room",
  description: "Stanza narrativa realtime per campagne GDR online e ibride."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
