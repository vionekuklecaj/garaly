import PageShell from "@/components/PageShell";
import DashboardContent from "@/components/DashboardContent";
import { getPageContext } from "@/lib/session";

type SP = { lang?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="container" style={{ paddingTop: 24, paddingBottom: 64 }}>
          <h1 className="page-title hfont">{t.dashboardTitle}</h1>
          <p style={{ color: "var(--ink-muted)", margin: "-12px 0 32px" }}>{t.dashboardSub}</p>

          {!user ? (
            <div className="empty-state">
              <p>{t.loginToList}</p>
            </div>
          ) : (
            <DashboardContent lang={lang} t={t} />
          )}
        </div>
      </main>
    </PageShell>
  );
}
