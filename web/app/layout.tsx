import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth";

// next/font downloads at build time and self-hosts; no runtime Google requests
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "VetServe Katy",
  description:
    "Straight answers about veterans' benefits from official sources, and neighbors who'll help with the rest. Built in Katy for TX-22.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-bg text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-primary"
        >
          Skip to content
        </a>
        <AuthProvider>
          <ToastProvider>
            <SiteHeader />
            <div id="main">{children}</div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
