import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "نور القرآن — رفيقك مع القرآن",
  description: "المصحف الشريف — نور القرآن | Quran Mushaf — Noor Al-Quran",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "نور القرآن",
  },
};

export const viewport: Viewport = {
  themeColor: "#123B2A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 4,
  minimumScale: 1,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className="min-h-full flex flex-col antialiased"
        style={{
          fontFamily: "'Tajawal', 'Segoe UI', Tahoma, sans-serif",
          backgroundColor: '#FBF8EF',
          color: '#17231D',
        }}
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
