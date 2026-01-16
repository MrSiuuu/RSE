import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RSE App - Formation RSE pour PME",
  description: "Module de formation RSE pour dirigeants et managers de PME ivoiriennes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
