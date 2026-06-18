import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://127.0.0.1:3000"),
  title: "Serhii Drachuk | Senior PHP Laravel Developer",
  description:
    "Senior PHP/Laravel developer building scalable SaaS platforms, analytics systems, e-commerce integrations, and real-time applications.",
  openGraph: {
    title: "Serhii Drachuk | Senior PHP Laravel Developer",
    description:
      "Enterprise-grade backend engineering with a sharp product edge.",
    images: ["/assets/hero-command-center.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
