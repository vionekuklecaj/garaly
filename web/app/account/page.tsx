import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import AccountForm from "@/components/AccountForm";
import { getPageContext } from "@/lib/session";

type SP = { lang?: string };

export default async function AccountPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);

  if (!user) notFound();

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="auth-wrap">
          <div className="auth-card">
            <h1 className="hfont">{t.editAccountTitle}</h1>
            <AccountForm lang={lang} t={t} user={user} />
          </div>
        </div>
      </main>
    </PageShell>
  );
}
