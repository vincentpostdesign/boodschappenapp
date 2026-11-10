"use client";

import "./globals.css";
import { ErrorScreen } from "@/components/ErrorScreen";

// Vangt ook fouten in de hoofdlayout op (in plaats van het kale "Application error").
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="nl">
      <body className="min-h-dvh antialiased">
        <ErrorScreen error={error} reset={reset} />
      </body>
    </html>
  );
}
