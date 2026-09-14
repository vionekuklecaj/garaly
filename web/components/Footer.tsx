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
            <a href={`/search?lang=${lang}`}>{t.navFind}</a>
            <a href={`/list-space?lang=${lang}`}>{t.navList}</a>
            <a href={`/?lang=${lang}#how-it-works`}>{t.navHow}</a>
          </div>
          <div className="footer-col">
            <h4>{t.footerCompany}</h4>
            <a href={`/about?lang=${lang}`}>{t.navAbout}</a>
            <a href={`/?lang=${lang}`}>{t.breadcrumbHome}</a>
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
