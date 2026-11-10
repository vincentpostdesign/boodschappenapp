"use client";

import { createContext, useContext } from "react";
import type { PersonId } from "@/lib/types";

// De foto's komen één keer als stijl in de pagina (class "avatar-<id>"); elke stip verwijst daarnaar.
const AvatarContext = createContext<Record<PersonId, boolean>>({ vincent: false, marleen: false });

export function AvatarProvider({ urls, children }: { urls: Record<PersonId, string | null>; children: React.ReactNode }) {
  const css = (Object.entries(urls) as [PersonId, string | null][])
    .filter(([, u]) => u)
    .map(([id, u]) => `.avatar-${id}{background-image:url(${u})}`)
    .join("");
  return (
    <AvatarContext.Provider value={{ vincent: Boolean(urls.vincent), marleen: Boolean(urls.marleen) }}>
      {css && <style>{css}</style>}
      {children}
    </AvatarContext.Provider>
  );
}

export function useHasAvatar(person: PersonId): boolean {
  return useContext(AvatarContext)[person];
}
