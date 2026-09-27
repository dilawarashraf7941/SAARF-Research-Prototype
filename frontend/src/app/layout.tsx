import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAARF — State-Aware Adaptive Recovery Policy",
  description:
    "Research prototype for the MSc thesis “State-Aware Adaptive Recovery Policy for Reliable Long-Horizon Agentic AI Systems” (deterministic simulation).",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} antialiased`}>
      <body className="min-h-screen bg-canvas">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
