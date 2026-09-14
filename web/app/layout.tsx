import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Garaly",
  description: "Garagen, Lagerräume, Stellplätze und mehr – finde freien Raum in deiner Nähe oder verdiene mit deinem eigenen.",
  icons: { icon: "/garaly-icon.png" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Root layouts don't receive searchParams, so ?lang= isn't visible here --
  // only the cookie is. Individual pages resolve the full lang (query param
  // included) via getPageContext() for everything that actually renders text.
  const jar = await cookies();
  const lang = jar.get("garaly_lang")?.value === "en" ? "en" : "de";

  return (
    <html lang={lang} className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
