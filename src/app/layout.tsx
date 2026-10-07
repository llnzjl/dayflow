import "./globals.css";
import type { Metadata, Viewport } from "next";
export const metadata: Metadata = { title: "DateFlow — AI day planner", description: "Plan your day once. DateFlow keeps it realistic, affordable and updated." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#d94838" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
