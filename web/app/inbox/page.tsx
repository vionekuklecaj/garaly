import PageShell from "@/components/PageShell";
import InboxContent from "@/components/InboxContent";
import { getPageContext } from "@/lib/session";

type SP = { lang?: string; conversation?: string };

export default async function InboxPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="container" style={{ paddingTop: 24, paddingBottom: 64 }}>
          <h1 className="page-title hfont">{t.inboxTitle}</h1>

          {!user ? (
            <div className="empty-state">
              <p>{t.loginToList}</p>
            </div>
          ) : (
            <InboxContent lang={lang} t={t} userId={user.id} initialConversationId={sp.conversation || null} />
          )}
        </div>
      </main>
    </PageShell>
  );
}
