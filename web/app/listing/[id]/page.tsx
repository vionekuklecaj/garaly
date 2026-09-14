import PageShell from "@/components/PageShell";
import BookingForm from "@/components/BookingForm";
import SaveButton from "@/components/SaveButton";
import ShareButton from "@/components/ShareButton";
import ReviewForm from "@/components/ReviewForm";
import { getPageContext, backendGet } from "@/lib/session";
import { AMENITY_KEYS, type AmenityKey, type Review, type Space } from "@/lib/types";
import type { Translator } from "@/lib/translations";

type SP = { lang?: string; move_in?: string; move_out?: string; review?: string };

const AMENITY_ICONS: Record<AmenityKey, string> = {
  lighting: "💡",
  electricity: "🔌",
  security: "📹",
  access: "🔑",
  dry: "☀️",
  parking: "🚗",
};

function amenityLabel(key: AmenityKey, t: Translator): string {
  return t[`amenity_${key}` as keyof Translator];
}

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
  const reviews = await backendGet<Review[]>(`/api/spaces/${id}/reviews`);
  const moveIn = sp.move_in || "";
  const moveOut = sp.move_out || "";
  const isOwner = Boolean(user && space && user.id === space.owner_id);
  const loginHref = `/login?lang=${lang}&next=/listing/${id}`;

  const amenities = (space?.amenities || []).filter((a): a is AmenityKey => (AMENITY_KEYS as readonly string[]).includes(a));

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
                    {space.city}
                    {space.review_count ? ` · ★ ${space.review_average} (${space.review_count} ${t.reviews})` : ` · ${t.noReviewsYet}`}
                  </div>
                </div>
                <div className="detail-actions">
                  <SaveButton spaceId={space.id} isLoggedIn={Boolean(user)} t={t} loginHref={loginHref} />
                  <ShareButton title={space.title} t={t} />
                </div>
              </div>

              <div className="gallery reveal">
                {space.images && space.images.length > 0 ? (
                  <>
                    <div className="main-photo" style={{ background: `url(${space.images[0].url}) center/cover` }} />
                    <div className="sub-grid">
                      {space.images.slice(1, 5).map((img, i) => (
                        <div
                          key={img.id}
                          className={`sub-photo${i === 3 && space.images!.length > 5 ? " more" : ""}`}
                          data-more={`+${space.images!.length - 5} more`}
                          style={{ background: `url(${img.url}) center/cover` }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="main-photo">{space.category.toUpperCase()} PHOTO</div>
                    <div className="sub-grid">
                      <div className="sub-photo">PHOTO 2</div>
                      <div className="sub-photo">PHOTO 3</div>
                      <div className="sub-photo">PHOTO 4</div>
                      <div className="sub-photo">PHOTO 5</div>
                    </div>
                  </>
                )}
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
                  {amenities.length > 0 ? (
                    <div className="amenities-grid">
                      {amenities.map((key) => (
                        <div className="amenity" key={key}>
                          {AMENITY_ICONS[key]} {amenityLabel(key, t)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
                      {lang === "de" ? "Keine Ausstattung angegeben." : "No amenities listed."}
                    </p>
                  )}

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

                  {sp.review && user && (
                    <div style={{ marginTop: 32 }}>
                      <ReviewForm bookingId={sp.review} lang={lang} t={t} />
                    </div>
                  )}

                  {reviews && reviews.length > 0 && (
                    <div style={{ marginTop: 32 }}>
                      <h3 className="hfont" style={{ marginBottom: 16 }}>
                        {t.reviews} ({reviews.length})
                      </h3>
                      {reviews.map((r) => (
                        <div key={r.id} className="request-card">
                          <div className="row1">
                            <div className="title">{r.renter_name}</div>
                            <span className="status-badge accepted">{"★".repeat(r.rating)}</span>
                          </div>
                          {r.comment && <div className="note">{r.comment}</div>}
                        </div>
                      ))}
                    </div>
                  )}
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
                        {!space.is_active
                          ? t.pausedNotice
                          : space.status === "pending_review"
                            ? t.pendingReviewNotice
                            : space.status === "rejected"
                              ? t.rejectedNotice
                              : t.ownListingNotice}
                      </div>
                      <a
                        className="btn-primary"
                        style={{ width: "100%", display: "block", textAlign: "center", boxSizing: "border-box" }}
                        href={`/manage-listing/${space.id}?lang=${lang}`}
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
