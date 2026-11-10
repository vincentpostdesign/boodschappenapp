import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Boodschappen",
  description: "Gezamenlijke boodschappenlijst van Vincent en Marleen",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Boodschappen", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#121614" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className={`${geistSans.variable} antialiased min-h-dvh`}>
        {children}
        <div
          role="alert"
          className="draai-melding fixed inset-0 z-[100] flex-col items-center justify-center gap-3 bg-bg px-8 text-center"
        >
          <svg viewBox="0 0 24 24" className="h-12 w-12 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
            <path d="M11 18.5h2" />
          </svg>
          <p className="text-lg font-semibold">Draai je telefoon rechtop</p>
          <p className="text-sm text-muted">De boodschappen-app werkt alleen staand.</p>
        </div>
      </body>
    </html>
  );
}
