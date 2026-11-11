import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
const inter = localFont({ src: "../fonts/InterVariable.woff2", display: "swap", variable: "--font-inter", weight: "100 900" });
export const metadata: Metadata = { title: "DAYFLOW — Make Every Day Flow", description: "A little clarity. A lot of possibility. Plan your day beautifully with Dayflow." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#080b16" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className={inter.variable}>{children}</body></html>);
}
