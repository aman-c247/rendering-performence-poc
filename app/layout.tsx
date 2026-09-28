import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rendering Performance POC",
  description: "Layout thrashing vs batched DOM reads/writes vs compositor-only animation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/bad-thrashing">❌ Bad (Thrashing)</a>
          <a href="/optimized">✅ Optimized (Batched + rAF)</a>
          <a href="/composited">🚀 Best (Compositor-only)</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
