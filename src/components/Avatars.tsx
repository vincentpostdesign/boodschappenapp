"use client";

import { createContext, useContext } from "react";
import type { PersonId } from "@/lib/types";

const AvatarContext = createContext<Record<PersonId, string | null>>({ vincent: null, marleen: null });

export function AvatarProvider({ urls, children }: { urls: Record<PersonId, string | null>; children: React.ReactNode }) {
  return <AvatarContext.Provider value={urls}>{children}</AvatarContext.Provider>;
}

export function useAvatarUrl(person: PersonId): string | null {
  return useContext(AvatarContext)[person];
}
