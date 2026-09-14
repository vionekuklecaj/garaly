import PageShell from "@/components/PageShell";
import RegisterForm from "@/components/RegisterForm";
import { getPageContext } from "@/lib/session";

type SP = { lang?: string };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="auth-wrap">
          <div className="auth-card">
            <h1 className="hfont">{lang === "de" ? "Konto erstellen" : "Create your account"}</h1>
            <p className="sub2">{lang === "de" ? "Werde Teil von Garaly." : "Join Garaly."}</p>

            <RegisterForm lang={lang} />

            <div className="auth-switch">
              {lang === "de" ? "Schon ein Konto?" : "Already have an account?"} <a href={`/login?lang=${lang}`}>{t.login}</a>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
