import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AuthSessionSync from "@/app/components/AuthSessionSync";
import ToastProvider from "@/app/components/ui/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gifter.skeletonkeysolution.com"),
  title: {
    default: "🎁 GIFTer",
    template: "%s | 🎁 GIFTer",
  },
  description: "Track gifts, budgets, and status—so you can be done GIFTing.",
  openGraph: {
    type: "website",
    url: "https://gifter.skeletonkeysolution.com",
    title: "🎁 GIFTer",
    siteName: "GIFTer",
    description: "Track gifts, budgets, and status—so you can be done GIFTing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "🎁 GIFTer",
    description: "Track gifts, budgets, and status—so you can be done GIFTing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionSync />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
