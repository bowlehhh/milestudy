import type { Metadata } from "next";
import { Sora, Space_Mono } from "next/font/google";

import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Milestudy Prototype",
  description:
    "Prototype LMS Milestudy: assignment management, gamification, analytics, streak fire, dan smart attendance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${sora.variable} ${spaceMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
