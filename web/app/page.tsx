import PageShell from "@/components/PageShell";
import CategoryCarousel from "@/components/CategoryCarousel";
import { getPageContext, backendGet } from "@/lib/session";
import { CATEGORIES } from "@/lib/translations";

type Stats = { total_spaces: number; total_cities: number };

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);
  const stats = await backendGet<Stats>("/api/spaces/stats");

  const totalSpacesLabel = stats?.total_spaces ? stats.total_spaces.toLocaleString("de-DE") : "10.000+";
  const totalCitiesLabel = stats?.total_cities ? String(stats.total_cities) : "350+";

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <section className="hero">
          <div className="container hero-inner">
            <div>
              <div className="hero-badge">
                <span className="dot" />
                {t.heroBadge}
              </div>
              <h1 className="hfont">
                {t.heroTitle1}
                <br />
                <span className="accent">{t.heroTitle2}</span>
              </h1>
              <p className="sub">{t.heroSub}</p>

              <form className="search-bar" action="/search" method="get">
                <input type="hidden" name="lang" value={lang} />
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "8px 14px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="#767c85" strokeWidth="2" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#767c85" strokeWidth="2" />
                  </svg>
                  <input name="city" placeholder={t.heroSearchPh} />
                </div>
                <button type="submit" className="btn-primary">
                  {t.heroSearchBtn}
                </button>
              </form>

              <div className="hero-stats">
                <div>
                  <div className="value hfont">{totalSpacesLabel}</div>
                  <div className="label">{t.statSpaces}</div>
                </div>
                <div>
                  <div className="value hfont">{totalCitiesLabel}</div>
                  <div className="label">{t.statCities}</div>
                </div>
                <div>
                  <div className="value hfont">99%</div>
                  <div className="label">{t.statSecure}</div>
                </div>
              </div>
            </div>

            <div className="hero-collage">
              <div className="floating-card" style={{ top: 0, right: 20, animationDelay: "0s" }}>
                <div className="photo">GARAGE PHOTO</div>
                <div className="body">
                  <div className="title">{t.card1Title}</div>
                  <div className="loc">{t.card1Loc}</div>
                  <div className="price">
                    120 € <span className="unit">/ {t.perMonth}</span>
                  </div>
                </div>
              </div>
              <div className="floating-card" style={{ top: 220, left: 0, width: 240, animationDelay: "1.5s" }}>
                <div className="photo" style={{ height: 120 }}>
                  STORAGE PHOTO
                </div>
                <div className="body">
                  <div className="title">{t.catStorage} · Berlin</div>
                  <div className="loc">2.4 km</div>
                  <div className="price">
                    65 € <span className="unit">/ {t.perMonth}</span>
                  </div>
                </div>
              </div>
              <div className="floating-card" style={{ bottom: 0, right: 60, width: 220, padding: 14, animationDelay: "3s" }}>
                <div className="body" style={{ padding: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div className="title" style={{ fontSize: 13 }}>
                      99% {t.statSecure}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal">
          <div className="container">
            <h2 className="hfont">{t.categoriesTitle}</h2>
            <CategoryCarousel lang={lang} categories={CATEGORIES} t={t} />
          </div>
        </section>

        <section className="section section-divider reveal" id="how-it-works">
          <div className="container">
            <h2 className="hfont">{t.howTitle}</h2>
            <div className="steps-grid reveal-stagger">
              <div className="step">
                <div className="num">1</div>
                <div className="title">{t.howStep1Title}</div>
                <div className="sub">{t.howStep1Sub}</div>
              </div>
              <div className="step">
                <div className="num">2</div>
                <div className="title">{t.howStep2Title}</div>
                <div className="sub">{t.howStep2Sub}</div>
              </div>
              <div className="step">
                <div className="num">3</div>
                <div className="title">{t.howStep3Title}</div>
                <div className="sub">{t.howStep3Sub}</div>
              </div>
              <div className="step">
                <div className="num">4</div>
                <div className="title">{t.howStep4Title}</div>
                <div className="sub">{t.howStep4Sub}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-divider reveal">
          <div className="container trust-grid">
            <div>
              <h2 className="hfont">{t.trustTitle}</h2>
              <p style={{ color: "var(--ink-muted)", marginBottom: 28 }}>{t.trustSub}</p>
              <div className="trust-point">
                <span className="check">✓</span>
                {t.trustPoint1}
              </div>
              <div className="trust-point">
                <span className="check">✓</span>
                {t.trustPoint2}
              </div>
              <div className="trust-point">
                <span className="check">✓</span>
                {t.trustPoint3}
              </div>
              <div className="trust-point">
                <span className="check">✓</span>
                {t.trustPoint4}
              </div>
            </div>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value hfont">10.000+</div>
                <div className="label">{t.statSpaces}</div>
              </div>
              <div className="stat-tile">
                <div className="value hfont">7.500+</div>
                <div className="label">{t.statUsers}</div>
              </div>
              <div className="stat-tile">
                <div className="value hfont">350+</div>
                <div className="label">{t.statCities}</div>
              </div>
              <div className="stat-tile">
                <div className="value hfont">4.8★</div>
                <div className="label">{t.statRating}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal">
          <div className="container">
            <div className="cta-band" style={{ maxWidth: 900 }}>
              <h2 className="hfont">{t.ctaTitle}</h2>
              <p>{t.ctaSub}</p>
              <a className="btn-primary" style={{ display: "inline-block" }} href={`/list-space?lang=${lang}`}>
                {t.ctaBtn}
              </a>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
