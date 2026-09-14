import PageShell from "@/components/PageShell";
import BookingForm from "@/components/BookingForm";
import { getPageContext, backendGet } from "@/lib/session";
import type { Space } from "@/lib/types";

type SP = { lang?: string; move_in?: string; move_out?: string };

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);
  const space = await backendGet<Space>(`/api/spaces/${id}`);
  const moveIn = sp.move_in || "";
  const moveOut = sp.move_out || "";
  const isOwner = Boolean(user && space && user.id === space.owner_id);

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="container" style={{ paddingTop: 24 }}>
          {!space ? (
            <div className="empty-state">
              <p>{lang === "de" ? "Anzeige nicht gefunden." : "Listing not found."}</p>
            </div>
          ) : (
            <>
              <div className="breadcrumb">
                <a href={`/?lang=${lang}`}>{t.breadcrumbHome}</a> / <a href={`/search?lang=${lang}`}>{t.breadcrumbFind}</a> /{" "}
                {space.title}
              </div>

              <div className="detail-header-row">
                <div>
                  <h1 className="detail-title hfont">{space.title}</h1>
                  <div className="detail-meta">
                    {space.city} · ★ 4.8 (32 {t.reviews})
                  </div>
                </div>
                <div className="detail-actions">
                  <button className="btn-secondary">{t.save}</button>
                  <button className="btn-secondary">{t.share}</button>
                </div>
              </div>

              <div className="gallery reveal">
                <div className="main-photo">{space.category.toUpperCase()} PHOTO</div>
                <div className="sub-grid">
                  <div className="sub-photo">PHOTO 2</div>
                  <div className="sub-photo">PHOTO 3</div>
                  <div className="sub-photo">PHOTO 4</div>
                  <div className="sub-photo more" data-more="+3 more">
                    PHOTO 5
                  </div>
                </div>
              </div>

              <div className="detail-body">
                <div className="reveal">
                  <div className="host-row">
                    <div className="avatar">{(space.owner_name?.[0] || "G").toUpperCase()}</div>
                    <div>
                      <div className="host-name">
                        {t.hostedBy} {space.owner_name || "Garaly Host"}
                      </div>
                      <div className="host-verified">{t.verifiedHost}</div>
                    </div>
                  </div>

                  <p className="description">
                    {space.description || (lang === "de" ? "Beschreibung folgt in Kürze." : "Description coming soon.")}
                  </p>

                  <h3 className="hfont" style={{ marginBottom: 16 }}>
                    {t.amenities}
                  </h3>
                  <div className="amenities-grid">
                    <div className="amenity">💡 {t.amenity_lighting}</div>
                    <div className="amenity">🔌 {t.amenity_electricity}</div>
                    <div className="amenity">📹 {t.amenity_security}</div>
                    <div className="amenity">🔑 {t.amenity_access}</div>
                    <div className="amenity">☀️ {t.amenity_dry}</div>
                    <div className="amenity">🚗 {t.amenity_parking}</div>
                  </div>

                  <h3 className="hfont" style={{ margin: "32px 0 4px" }}>
                    {t.mapTitle}
                  </h3>
                  <div className="map-embed-wrap">
                    <iframe
                      loading="lazy"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(space.address || space.city)}&output=embed`}
                      allowFullScreen
                    />
                  </div>
                  <div className="map-caption">{t.mapApprox}</div>
                </div>

                <div className="booking-card reveal">
                  <div className="booking-price">
                    {Math.trunc(space.price_month)} € <span className="unit">/ {t.perMonth}</span>
                  </div>
                  {isOwner ? (
                    <>
                      <div
                        style={{
                          background: "#f1f3f1",
                          color: "var(--ink-muted)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          fontSize: 13.5,
                          marginBottom: 16,
                        }}
                      >
                        {t.ownListingNotice}
                      </div>
                      <a
                        className="btn-primary"
                        style={{ width: "100%", display: "block", textAlign: "center", boxSizing: "border-box" }}
                        href={`/dashboard?lang=${lang}`}
                      >
                        {t.manageInDashboard}
                      </a>
                    </>
                  ) : (
                    <>
                      <BookingForm
                        spaceId={space.id}
                        lang={lang}
                        t={t}
                        isLoggedIn={Boolean(user)}
                        initialMoveIn={moveIn}
                        initialMoveOut={moveOut}
                      />
                      <div className="booking-note">{t.noChargeYet}</div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </PageShell>
  );
}
