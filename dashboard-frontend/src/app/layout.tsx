import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Twin Kesehatan Desa",
  description: "Dashboard Manajemen Kesehatan Desa Digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} font-sans antialiased bg-gradient-to-br from-blue-50 via-blue-100 to-sky-50`}
      >
        {children}
      </body>
    </html>
  );
}
