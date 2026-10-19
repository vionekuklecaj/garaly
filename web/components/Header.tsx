"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang, Translator } from "@/lib/translations";
import type { User } from "@/lib/types";
import ProfileMenu from "./ProfileMenu";
import InboxNavButton from "./InboxNavButton";

type Props = {
  lang: Lang;
  user: User | null;
  t: Translator;
};

export default function Header({ lang, user, t }: Props) {
  const router = useRouter();

  function toggleLang() {
    const next: Lang = lang === "de" ? "en" : "de";
    document.cookie = `garaly_lang=${next};path=/;max-age=31536000`;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.location.href = url.toString();
  }

  return (
    <header className="site-header">
      <Link className="logo" href={`/?lang=${lang}`}>
        <img src="/garaly-icon.png" alt="Garaly" />
        <span className="hfont">Garaly</span>
      </Link>

      <nav className="main-nav">
        <Link href={`/search?lang=${lang}`}>{t.navFind}</Link>
        <Link href={`/list-space?lang=${lang}`}>{t.navList}</Link>
        <Link href={`/?lang=${lang}#how-it-works`}>{t.navHow}</Link>
        <Link href={`/about?lang=${lang}`}>{t.navAbout}</Link>
      </nav>

      <div className="header-right">
        <button className="lang-toggle" onClick={toggleLang}>
          <span className={lang !== "de" ? "off" : ""}>DE</span>
          <span className="dim">/</span>
          <span className={lang !== "en" ? "off" : ""}>EN</span>
        </button>
        {user ? (
          <>
            <InboxNavButton lang={lang} t={t} />
            <ProfileMenu lang={lang} user={user} t={t} />
          </>
        ) : (
          <Link href={`/login?lang=${lang}`}>{t.login}</Link>
        )}
        <button className="btn-primary" onClick={() => router.push(`/list-space?lang=${lang}`)}>
          {t.cta}
        </button>
      </div>
    </header>
  );
}
