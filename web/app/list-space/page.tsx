import PageShell from "@/components/PageShell";
import ListSpaceForm from "@/components/ListSpaceForm";
import { getPageContext } from "@/lib/session";

type SP = { lang?: string };

export default async function ListSpacePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="auth-wrap">
          <div className="auth-card" style={{ maxWidth: 520 }}>
            <h1 className="hfont">{t.listSpaceTitle}</h1>
            <p className="sub2">{t.listSpaceSub}</p>

            {!user ? (
              <>
                <div className="form-error visible">{t.loginToList}</div>
                <a className="btn-primary" style={{ width: "100%", display: "block", textAlign: "center", boxSizing: "border-box" }} href={`/login?lang=${lang}&next=/list-space`}>
                  {t.login}
                </a>
              </>
            ) : (
              <ListSpaceForm lang={lang} t={t} />
            )}
          </div>
        </div>
      </main>
    </PageShell>
  );
}
