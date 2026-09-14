import { cookies } from "next/headers";
import { cache } from "react";
import { getTranslator, type Lang } from "./translations";
import type { User } from "./types";

// Server-only: talks directly to the FastAPI backend (not through the
// same-origin /api proxy, since this runs on the Next.js server itself and
// same-origin/CORS rules don't apply here).
export const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export const SESSION_COOKIE = "garaly_session";
export const LANG_COOKIE = "garaly_lang";

// cache() dedupes this within a single request -- layout.tsx and a page both
// calling getCurrentUser() only hits the backend once per request.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch {
    return null;
  }
});

export async function getLang(searchParamLang?: string | string[]): Promise<Lang> {
  const jar = await cookies();
  const fromQuery = Array.isArray(searchParamLang) ? searchParamLang[0] : searchParamLang;
  const lang = fromQuery || jar.get(LANG_COOKIE)?.value || "de";
  return lang === "en" ? "en" : "de";
}

// Server-side GET helper for backend JSON endpoints that don't need the
// caller's session (public listing data, counts, etc).
export async function backendGet<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { cache: "no-store", ...init });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type SearchParams = Record<string, string | string[] | undefined>;

// Every page needs the same three things (lang, current user, translator);
// this is the one place that puts them together so each page.tsx doesn't
// repeat the wiring. Safe to call once per page -- getCurrentUser() is
// cache()-wrapped, so calling it again from a nested component in the same
// request doesn't hit the backend twice.
export async function getPageContext(searchParams?: SearchParams) {
  const lang = await getLang(searchParams?.lang);
  const user = await getCurrentUser();
  return { lang, user, t: getTranslator(lang) };
}
