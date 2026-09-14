import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import AdminQueueContent from "@/components/AdminQueueContent";
import { getPageContext } from "@/lib/session";

type SP = { lang?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);

  // Same philosophy as the backend's get_current_admin: 404 rather than a
  // visible "access denied" page, so a non-admin poking at the URL can't
  // even tell this page exists.
  if (!user?.is_admin) notFound();

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="container" style={{ paddingTop: 24, paddingBottom: 64 }}>
          <h1 className="page-title hfont">{t.adminQueueTitle}</h1>
          <p style={{ color: "var(--ink-muted)", margin: "-12px 0 32px" }}>{t.adminQueueSub}</p>
          <AdminQueueContent lang={lang} t={t} />
        </div>
      </main>
    </PageShell>
  );
}
