"use client";

import type { Lang, Translator } from "@/lib/translations";
import type { User } from "@/lib/types";
import ProfileMenu from "./ProfileMenu";

type Props = {
  lang: Lang;
  user: User | null;
  t: Translator;
};

export default function Header({ lang, user, t }: Props) {
  function toggleLang() {
    const next: Lang = lang === "de" ? "en" : "de";
    document.cookie = `garaly_lang=${next};path=/;max-age=31536000`;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.location.href = url.toString();
  }

  return (
    <header className="site-header">
      <a className="logo" href={`/?lang=${lang}`}>
        <img src="/garaly-icon.png" alt="Garaly" />
        <span className="hfont">Garaly</span>
      </a>

      <nav className="main-nav">
        <a href={`/search?lang=${lang}`}>{t.navFind}</a>
        <a href={`/list-space?lang=${lang}`}>{t.navList}</a>
        <a href={`/?lang=${lang}#how-it-works`}>{t.navHow}</a>
        <a href={`/about?lang=${lang}`}>{t.navAbout}</a>
      </nav>

      <div className="header-right">
        <button className="lang-toggle" onClick={toggleLang}>
          <span className={lang !== "de" ? "off" : ""}>DE</span>
          <span className="dim">/</span>
          <span className={lang !== "en" ? "off" : ""}>EN</span>
        </button>
        {user ? (
          <ProfileMenu lang={lang} user={user} t={t} />
        ) : (
          <a href={`/login?lang=${lang}`}>{t.login}</a>
        )}
        <button className="btn-primary" onClick={() => (window.location.href = `/list-space?lang=${lang}`)}>
          {t.cta}
        </button>
      </div>
    </header>
  );
}
