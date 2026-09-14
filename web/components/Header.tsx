"use client";

import type { Lang, Translator } from "@/lib/translations";
import type { User } from "@/lib/types";

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/?lang=" + lang;
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
        {user && (
          <>
            <a href={`/my-bookings?lang=${lang}`}>{t.navMyBookings}</a>
            <a href={`/dashboard?lang=${lang}`}>{t.navDashboard}</a>
          </>
        )}
      </nav>

      <div className="header-right">
        <button className="lang-toggle" onClick={toggleLang}>
          <span className={lang !== "de" ? "off" : ""}>DE</span>
          <span className="dim">/</span>
          <span className={lang !== "en" ? "off" : ""}>EN</span>
        </button>
        {user ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
          >
            {lang === "en" ? t.login : "Abmelden"}
          </a>
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
