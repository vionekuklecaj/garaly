import Link from "next/link";
import type { Lang, Translator } from "@/lib/translations";

type Props = {
  lang: Lang;
  t: Translator;
};

export default function Footer({ lang, t }: Props) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="logo" style={{ marginBottom: 12 }}>
              <img src="/garaly-icon.png" alt="Garaly" style={{ width: 28, height: 28 }} />
              <span className="hfont" style={{ fontSize: 18 }}>
                Garaly
              </span>
            </div>
            <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>{t.footerTagline}</p>
          </div>
          <div className="footer-col">
            <h4>{t.footerProduct}</h4>
            <Link href={`/search?lang=${lang}`}>{t.navFind}</Link>
            <Link href={`/list-space?lang=${lang}`}>{t.navList}</Link>
            <Link href={`/?lang=${lang}#how-it-works`}>{t.navHow}</Link>
          </div>
          <div className="footer-col">
            <h4>{t.footerCompany}</h4>
            <Link href={`/about?lang=${lang}`}>{t.navAbout}</Link>
            <Link href={`/?lang=${lang}`}>{t.breadcrumbHome}</Link>
          </div>
          <div className="footer-col">
            <h4>{t.footerLegal}</h4>
            <a href="#">Impressum</a>
            <a href="#">Datenschutz</a>
          </div>
        </div>
        <div className="footer-bar">© 2026 Garaly. {t.copyright}</div>
      </div>
    </footer>
  );
}
