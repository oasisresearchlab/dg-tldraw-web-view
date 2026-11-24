import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discourse Graph Canvas",
  description:
    "A real-time collaborative tldraw canvas for discourse graphs: place questions, claims, evidence and sources, open them in a sidebar, annotate together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
