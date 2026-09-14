import PageShell from "@/components/PageShell";
import SearchResults from "@/components/SearchResults";
import { getPageContext } from "@/lib/session";
import { CATEGORIES } from "@/lib/translations";

type SP = {
  lang?: string;
  city?: string;
  category?: string;
  move_in?: string;
  move_out?: string;
  radius?: string;
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);
  const city = sp.city || "";
  const activeCategory = sp.category || "all";
  const moveIn = sp.move_in || "";
  const moveOut = sp.move_out || "";
  const radius = sp.radius || "";

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="container">
          <div className="breadcrumb">
            <a href={`/?lang=${lang}`}>{t.breadcrumbHome}</a> / {t.breadcrumbFind}
          </div>
          <h1 className="page-title hfont">
            {t.searchTitleFor} {city}
          </h1>

          <form className="search-bar-full reveal" action="/search" method="get" style={{ marginBottom: 8 }}>
            <input type="hidden" name="lang" value={lang} />

            <div className="search-seg">
              <label>{t.searchLocation}</label>
              <input name="city" defaultValue={city} placeholder={t.searchLocationPh} />
            </div>

            <div className="search-seg">
              <label>{t.searchCategory}</label>
              <select name="category" defaultValue={activeCategory}>
                <option value="all">{t.searchCategoryAll}</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c[lang]}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-seg">
              <label>{t.searchMoveIn}</label>
              <input type="date" name="move_in" defaultValue={moveIn} />
            </div>

            <div className="search-seg">
              <label>{t.searchMoveOut}</label>
              <input type="date" name="move_out" defaultValue={moveOut} />
            </div>

            <div className="search-seg">
              <label>{t.searchRadius}</label>
              <select name="radius" defaultValue={radius}>
                <option value="">{t.radiusAny}</option>
                <option value="5">5 {t.radiusKm}</option>
                <option value="10">10 {t.radiusKm}</option>
                <option value="25">25 {t.radiusKm}</option>
                <option value="50">50 {t.radiusKm}</option>
              </select>
            </div>

            <div className="search-seg-btn">
              <button type="submit" className="btn-primary" aria-label={t.heroSearchBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </form>

          <SearchResults
            lang={lang}
            t={t}
            city={city}
            activeCategory={activeCategory}
            moveIn={moveIn}
            moveOut={moveOut}
            radius={radius}
          />
        </div>
      </main>
    </PageShell>
  );
}
