import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  getSiteOrigin,
  getSiteUrl,
  siteDescription,
  siteTitle
} from "@/lib/site-config";
import "./globals.css";

const siteUrl = getSiteUrl();
const heroImageUrl = `${siteUrl}/assets/hero-command-center.png`;

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: siteUrl
  },
  openGraph: {
    title: siteTitle,
    description:
      "Enterprise-grade backend engineering with a sharp product edge.",
    url: siteUrl,
    siteName: "Serhii Drachuk Portfolio",
    images: [heroImageUrl]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [heroImageUrl]
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
