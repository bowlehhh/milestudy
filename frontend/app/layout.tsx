import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Milestudy Workspace",
  description:
    "Milestudy Workspace untuk operasional harian: kelola kelas, tugas, dan siswa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
