import PageShell from "@/components/PageShell";
import { getPageContext } from "@/lib/session";
import { TEAM } from "@/lib/translations";

type SP = { lang?: string };

export default async function AboutPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="container" style={{ paddingTop: 24 }}>
          <div className="breadcrumb">
            <a href={`/?lang=${lang}`}>{t.breadcrumbHome}</a> / {t.aboutTitle}
          </div>
          <h1 className="page-title hfont">{t.aboutTitle}</h1>
          <p style={{ color: "var(--ink-muted)", maxWidth: 640, margin: "-8px 0 40px", lineHeight: 1.6 }}>{t.aboutIntro}</p>
        </div>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="team-grid reveal-stagger">
              {TEAM.map((member) => (
                <div className="team-card" key={member.name[lang]}>
                  <div className="team-avatar">{member.name[lang][0].toUpperCase()}</div>
                  <div className="team-name">{member.name[lang]}</div>
                  <div className="team-role">{member.role[lang]}</div>
                  <p className="team-bio">{member.bio[lang]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
