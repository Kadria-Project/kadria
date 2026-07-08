import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kadria.fr"),
  title: {
    default: "Kadria - Assistant commercial pour artisans",
    template: "%s - Kadria",
  },
  description:
    "Kadria aide les artisans a transformer leurs demandes clients en dossiers qualifies, devis suivis, relances et chantiers mieux pilotes.",
  applicationName: "Kadria",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Kadria - Assistant commercial pour artisans",
    description:
      "Transformez vos demandes clients en dossiers clairs, devis suivis et chantiers mieux pilotes avec Kadria.",
    url: "https://kadria.fr",
    siteName: "Kadria",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kadria - Assistant commercial pour artisans",
    description:
      "Qualifiez vos demandes, suivez vos devis et pilotez vos chantiers avec Kadria.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
